import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeOccupancy, deriveRoomStatus, isBedStatus } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/rooms/beds/[bedId]
 *
 * Manually edit a single bed: its status, the admitted patient's name, and
 * optional notes. Any change cascades upward inside one transaction: the owning
 * room's status is re-derived from its beds, and the parent RoomCategory's
 * aggregate counters (occupied / available / occupancy %) are recomputed — so
 * every view stays consistent. Never recreates rooms or beds; only the target
 * bed row is touched.
 *
 * Body: { status: "Available" | "Occupied" | "Cleaning" | "Maintenance",
 *         patientName?: string | null,
 *         notes?: string | null }
 *
 * Returns: { data: { bed, category } } — the updated bed plus fresh category
 * counters, so the UI can update in place without a refetch.
 */
export async function PATCH(
  request: Request,
  context: any,
) {
  try {
    const resolvedParams = await context.params;
    const bedId = resolvedParams?.bedId;
    const body = await request.json().catch(() => ({}));
    const { status, patientName, notes } = body as {
      status?: string;
      patientName?: string | null;
      notes?: string | null;
    };

    if (!status || !isBedStatus(status)) {
      return NextResponse.json(
        { error: "Invalid or missing `status`." },
        { status: 400 },
      );
    }

    const bed = await prisma.bed.findUnique({
      where: { id: bedId },
      include: { room: true },
    });

    if (!bed) {
      return NextResponse.json({ error: "Bed not found." }, { status: 404 });
    }

    const categoryId = bed.room.categoryId;
    const roomId = bed.roomId;

    // A patient name only makes sense for an occupied bed; any other status is a
    // discharge and clears it.
    const nextPatient =
      status === "Occupied" ? (patientName?.trim() || "Unassigned") : null;

    // Notes are optional and independent of status. Only overwrite when the
    // caller actually sent the field (undefined = leave as-is).
    const data: { status: string; patientName: string | null; notes?: string | null } = {
      status,
      patientName: nextPatient,
    };
    if (notes !== undefined) {
      data.notes = typeof notes === "string" ? notes.trim() || null : null;
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update the bed itself (updatedAt is bumped automatically).
      const updatedBed = await tx.bed.update({ where: { id: bedId }, data });

      // 2. Re-derive the owning room's status from its (now updated) beds.
      const roomBeds = await tx.bed.findMany({
        where: { roomId },
        select: { status: true },
      });
      await tx.room.update({
        where: { id: roomId },
        data: { status: deriveRoomStatus(roomBeds.map((b) => b.status)) },
      });

      // 3. Recompute the category's aggregate counters from live bed statuses.
      const category = await tx.roomCategory.findUniqueOrThrow({
        where: { id: categoryId },
      });
      const occupiedCount = await tx.bed.count({
        where: { room: { categoryId }, status: "Occupied" },
      });
      const availableCount = await tx.bed.count({
        where: { room: { categoryId }, status: "Available" },
      });
      const { occupiedBeds, availableBeds, occupancyPercentage } =
        computeOccupancy(category.totalBeds, occupiedCount, availableCount);

      const updatedCategory = await tx.roomCategory.update({
        where: { id: categoryId },
        data: { occupiedBeds, availableBeds, occupancyPercentage },
      });

      return { bed: updatedBed, category: updatedCategory };
    });

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (err) {
    console.error("[api/rooms/beds/:id] Failed to update bed:", err);
    return NextResponse.json(
      { error: "Failed to update bed." },
      { status: 500 },
    );
  }
}
