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
