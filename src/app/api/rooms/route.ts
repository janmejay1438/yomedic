import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Always run at request time against live DB state (never cached/prerendered).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/rooms
 *
 * Returns every RoomCategory with its live aggregate capacity counters,
 * ordered by room type. Used by the Room & Bed Management dashboard grid.
 */
export async function GET() {
  try {
    const categories = await prisma.roomCategory.findMany({
      orderBy: { roomType: "asc" },
    });

    return NextResponse.json(
      { data: categories, count: categories.length },
      { status: 200 },
    );
  } catch (err) {
    console.error("[api/rooms] Failed to load categories:", err);
    return NextResponse.json(
      { error: "Failed to load room categories." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rooms
 * Create a new RoomCategory, with its specified number of rooms and beds per room.
 * Body: { roomType, totalRooms, bedsPerRoom }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { roomType, totalRooms: trRaw, bedsPerRoom: bprRaw } = body;

    if (!roomType?.trim()) {
      return NextResponse.json({ error: "Room type name is required." }, { status: 400 });
    }

    const totalRooms = Number(trRaw);
    const bedsPerRoom = Number(bprRaw);

    if (isNaN(totalRooms) || totalRooms < 1 || isNaN(bedsPerRoom) || bedsPerRoom < 1) {
      return NextResponse.json({ error: "Total rooms and beds per room must be at least 1." }, { status: 400 });
    }

    const existing = await prisma.roomCategory.findUnique({
      where: { roomType: roomType.trim() }
    });
    if (existing) {
      return NextResponse.json({ error: `Room category "${roomType}" already exists.` }, { status: 400 });
    }

    const prefix = roomType
      .trim()
      .split(/\s+/)
      .map((w: string) => w[0])
      .join("")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase() || "R";

    const totalBeds = totalRooms * bedsPerRoom;

    const created = await prisma.$transaction(async (tx) => {
      const category = await tx.roomCategory.create({
        data: {
          roomType: roomType.trim(),
          totalRooms,
          bedsPerRoom,
          totalBeds,
          occupiedBeds: 0,
          availableBeds: totalBeds,
          occupancyPercentage: 0,
        }
      });

      for (let i = 0; i < totalRooms; i++) {
        const roomNumber = `${prefix}-${101 + i}`;
        await tx.room.create({
          data: {
            categoryId: category.id,
            roomNumber,
            status: "Available",
            beds: {
              create: Array.from({ length: bedsPerRoom }, (_, b) => ({
                bedNumber: `${roomNumber}-B${b + 1}`,
                status: "Available",
                patientName: null,
                notes: null,
              }))
            }
          }
        });
      }

      return tx.roomCategory.findUniqueOrThrow({
        where: { id: category.id }
      });
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    console.error("[api/rooms POST] Failed to create room category:", err);
    return NextResponse.json({ error: err.message || "Failed to create room category." }, { status: 500 });
  }
}

