import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeOccupancy, deriveRoomStatus } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A sane upper bound so a typo can't try to spawn a million rows in one write.
const MAX_ROOMS = 500;
const MAX_BEDS_PER_ROOM = 20;

/** Whole-number guard used for every numeric field on the edit form. */
function asPositiveInt(value: unknown, { min }: { min: number }): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n < min) return null;
  return n;
}

/** Derive a stable room-number prefix from an existing room (or the type). */
function derivePrefix(existingRoomNumber: string | undefined, roomType: string): string {
  if (existingRoomNumber && existingRoomNumber.includes("-")) {
    return existingRoomNumber.split("-").slice(0, -1).join("-");
  }
  const initials = roomType
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
  return initials || "R";
}

/** Trailing numeric index of a room number, e.g. "ICU-104" -> 104. */
function roomIndex(roomNumber: string): number {
  const n = Number(roomNumber.split("-").pop());
  return Number.isFinite(n) ? n : 0;
}

/** Trailing numeric index of a bed number, e.g. "ICU-104-B3" -> 3. */
function bedIndex(bedNumber: string): number {
  const n = Number(bedNumber.split("-B").pop());
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/rooms/[categoryId]
 *
 * Returns a single RoomCategory together with all of its rooms and, for each
 * room, its beds (patient name, notes, timestamps). Powers the details view.
 */
export async function GET(
  _request: Request,
  context: any,
) {
  try {
    const resolvedParams = await context.params;
    const categoryId = resolvedParams?.categoryId;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required." },
        { status: 400 },
      );
    }

    const category = await prisma.roomCategory.findUnique({
      where: { id: categoryId },
      include: {
        rooms: {
          orderBy: { roomNumber: "asc" },
          include: {
            beds: { orderBy: { bedNumber: "asc" } },
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Room category not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: category }, { status: 200 });
  } catch (err) {
    console.error("[api/rooms/:id] Failed to load category:", err);
    return NextResponse.json(
      { error: "Failed to load room category." },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/rooms/[categoryId]
 *
 * Edit a category's capacity incrementally — Total Rooms and Beds Per Room only.
 * Occupancy and per-room status are DERIVED from the beds, never set by hand.
 *
 * Guarantees (never lose data):
 *   • Increasing Total Rooms   → creates only the additional rooms + beds.
 *   • Increasing Beds Per Room → adds only the new beds to each room.
 *   • Decreasing either        → removes only UNOCCUPIED rooms/beds; if that
 *     isn't enough (an occupied room/bed would have to go) the request is
 *     rejected with 400 and nothing changes.
 *   • Existing beds keep their status, patient name and notes untouched.
 *
 * Body: { totalRooms, bedsPerRoom }
 */
export async function PATCH(
  request: Request,
  context: any,
) {
  try {
    const resolvedParams = await context.params;
    const categoryId = resolvedParams?.categoryId;

    if (!categoryId) {
      return NextResponse.json(
        { error: "Category ID is required." },
        { status: 400 },
      );
    }
    const body = await request.json().catch(() => ({}));

    const totalRooms = asPositiveInt(body.totalRooms, { min: 1 });
    const bedsPerRoom = asPositiveInt(body.bedsPerRoom, { min: 1 });

    if (totalRooms === null || totalRooms > MAX_ROOMS) {
      return NextResponse.json(
        { error: `Total Rooms must be a whole number between 1 and ${MAX_ROOMS}.` },
        { status: 400 },
      );
    }
    if (bedsPerRoom === null || bedsPerRoom > MAX_BEDS_PER_ROOM) {
      return NextResponse.json(
        { error: `Beds Per Room must be a whole number between 1 and ${MAX_BEDS_PER_ROOM}.` },
        { status: 400 },
      );
    }

    const category = await prisma.roomCategory.findUnique({
      where: { id: categoryId },
      include: {
        rooms: {
          orderBy: { roomNumber: "asc" },
          include: { beds: true },
        },
      },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Room category not found." },
        { status: 404 },
      );
    }

    const currentRooms = category.rooms;
    const occupiedInRoom = (room: (typeof currentRooms)[number]) =>
      room.beds.filter((b) => b.status === "Occupied").length;

    // ── Feasibility checks (reject before mutating anything) ─────────────────
    // Removing rooms: only unoccupied ones may go.
    if (totalRooms < currentRooms.length) {
      const removable = currentRooms.filter((r) => occupiedInRoom(r) === 0).length;
      const needed = currentRooms.length - totalRooms;
      if (removable < needed) {
        return NextResponse.json(
          {
            error: `Cannot reduce to ${totalRooms} rooms: only ${removable} of the ${needed} rooms to remove are empty. Occupied rooms cannot be deleted.`,
          },
          { status: 400 },
        );
      }
    }
    // Shrinking beds-per-room: every room's occupied beds must still fit.
    const offending = currentRooms.find((r) => occupiedInRoom(r) > bedsPerRoom);
    if (offending) {
      return NextResponse.json(
        {
          error: `Room ${offending.roomNumber} has ${occupiedInRoom(offending)} occupied bed(s); Beds Per Room can't go below that.`,
        },
        { status: 400 },
      );
    }

    const prefix = derivePrefix(currentRooms[0]?.roomNumber, category.roomType);

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Remove surplus rooms (unoccupied only, from the tail).
      let keptRooms = currentRooms;
      if (totalRooms < currentRooms.length) {
        const needed = currentRooms.length - totalRooms;
        const toDelete = currentRooms
          .filter((r) => occupiedInRoom(r) === 0)
          .sort((a, b) => roomIndex(b.roomNumber) - roomIndex(a.roomNumber))
          .slice(0, needed);
        const deleteIds = new Set(toDelete.map((r) => r.id));
        await tx.room.deleteMany({ where: { id: { in: [...deleteIds] } } });
        keptRooms = currentRooms.filter((r) => !deleteIds.has(r.id));
      }

      // 2. Reconcile each kept room's bed count to bedsPerRoom.
      for (const room of keptRooms) {
        const beds = room.beds;
        if (beds.length > bedsPerRoom) {
          // Remove the highest-numbered UNOCCUPIED beds only.
          const removeCount = beds.length - bedsPerRoom;
          const toDelete = beds
            .filter((b) => b.status !== "Occupied")
            .sort((a, b) => bedIndex(b.bedNumber) - bedIndex(a.bedNumber))
            .slice(0, removeCount)
            .map((b) => b.id);
          await tx.bed.deleteMany({ where: { id: { in: toDelete } } });
        } else if (beds.length < bedsPerRoom) {
          // Append fresh Available beds, numbered after the current max.
          const addCount = bedsPerRoom - beds.length;
          const start = beds.reduce((m, b) => Math.max(m, bedIndex(b.bedNumber)), 0);
          await tx.bed.createMany({
            data: Array.from({ length: addCount }, (_, i) => ({
              roomId: room.id,
              bedNumber: `${room.roomNumber}-B${start + 1 + i}`,
              status: "Available",
              patientName: null,
              notes: null,
            })),
          });
        }
      }

      // 3. Create additional rooms (each fully stocked with Available beds).
      if (totalRooms > currentRooms.length) {
        const addCount = totalRooms - currentRooms.length;
        const startRoom = currentRooms.reduce(
          (m, r) => Math.max(m, roomIndex(r.roomNumber)),
          100,
        );
        for (let i = 0; i < addCount; i++) {
          const roomNumber = `${prefix}-${startRoom + 1 + i}`;
          await tx.room.create({
            data: {
              categoryId,
              roomNumber,
              status: "Available",
              beds: {
                create: Array.from({ length: bedsPerRoom }, (_, b) => ({
                  bedNumber: `${roomNumber}-B${b + 1}`,
                  status: "Available",
                  patientName: null,
                  notes: null,
                })),
              },
            },
          });
        }
      }

      // 4. Re-derive room statuses and recompute category counters from beds.
      const freshRooms = await tx.room.findMany({
        where: { categoryId },
        include: { beds: { select: { status: true } } },
      });
      for (const room of freshRooms) {
        const derived = deriveRoomStatus(room.beds.map((b) => b.status));
        if (derived !== room.status) {
          await tx.room.update({ where: { id: room.id }, data: { status: derived } });
        }
      }

      const allStatuses = freshRooms.flatMap((r) => r.beds.map((b) => b.status));
      const totalBeds = allStatuses.length;
      const occupiedCount = allStatuses.filter((s) => s === "Occupied").length;
      const availableCount = allStatuses.filter((s) => s === "Available").length;
      const { occupiedBeds, availableBeds, occupancyPercentage } = computeOccupancy(
        totalBeds,
        occupiedCount,
        availableCount,
      );

      return tx.roomCategory.update({
        where: { id: categoryId },
        data: {
          totalRooms,
          bedsPerRoom,
          totalBeds,
          occupiedBeds,
          availableBeds,
          occupancyPercentage,
        },
      });
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[api/rooms/:id] Failed to update category:", err);
    return NextResponse.json(
      { error: "Failed to update room category." },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rooms/[categoryId]
 * Delete a room category and all its nested rooms and beds.
 * Only allowed if no beds in the category are currently occupied.
 */
export async function DELETE(
  _request: Request,
  context: any
) {
  try {
    const resolvedParams = await context.params;
    const categoryId = resolvedParams?.categoryId;

    if (!categoryId) {
      return NextResponse.json({ error: "Category ID is required." }, { status: 400 });
    }

    const category = await prisma.roomCategory.findUnique({
      where: { id: categoryId },
      include: {
        rooms: {
          include: { beds: true }
        }
      }
    });

    if (!category) {
      return NextResponse.json({ error: "Room category not found." }, { status: 404 });
    }

    const occupiedCount = category.rooms.reduce((acc, r) => {
      return acc + r.beds.filter((b) => b.status === "Occupied").length;
    }, 0);

    if (occupiedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete room category "${category.roomType}" because it has ${occupiedCount} occupied bed(s). Please discharge or move the patients first.` },
        { status: 400 }
      );
    }

    await prisma.roomCategory.delete({
      where: { id: categoryId }
    });

    return NextResponse.json({ message: "Room category deleted successfully." }, { status: 200 });
  } catch (err: any) {
    console.error("[api/rooms/:id DELETE] Failed to delete room category:", err);
    return NextResponse.json({ error: err.message || "Failed to delete room category." }, { status: 500 });
  }
}

