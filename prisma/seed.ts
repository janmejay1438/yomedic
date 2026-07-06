/**
 * Database seed for the Room / Bed management module.
 *
 * Run with:  npx tsx prisma/seed.ts   (or `npx prisma db seed`)
 *
 * Idempotent: wipes the three module tables and recreates a realistic snapshot
 * of a facility's room inventory. Bed statuses drive room statuses, which in
 * turn drive the aggregate counters on each RoomCategory (kept consistent via
 * `computeOccupancy`).
 */
import { prisma } from "../src/lib/prisma";
import {
  computeOccupancy,
  type BedStatus,
  type RoomStatus,
} from "../src/lib/rooms";

// ── Blueprint for the facility's room inventory ──────────────────────────────
interface CategoryBlueprint {
  roomType: string;
  totalRooms: number;
  bedsPerRoom: number;
  /** How many beds should start out occupied (rest are available/cleaning). */
  occupiedTarget: number;
  /** Room-number prefix, e.g. "S" -> S-101. */
  prefix: string;
}

const BLUEPRINTS: CategoryBlueprint[] = [
  { roomType: "Single Bed Rooms", totalRooms: 40, bedsPerRoom: 1, occupiedTarget: 29, prefix: "S" },
  { roomType: "Double Bed Rooms", totalRooms: 30, bedsPerRoom: 2, occupiedTarget: 44, prefix: "D" },
  { roomType: "Dormitory (Single Bed)", totalRooms: 25, bedsPerRoom: 1, occupiedTarget: 17, prefix: "DM" },
  { roomType: "ICU", totalRooms: 10, bedsPerRoom: 1, occupiedTarget: 8, prefix: "ICU" },
  { roomType: "General Ward", totalRooms: 12, bedsPerRoom: 4, occupiedTarget: 33, prefix: "GW" },
];

const PATIENT_NAMES = [
  "Ravi Kumar", "Priya Sharma", "Amit Patel", "Sunita Devi", "Rajesh Gupta",
  "Anjali Singh", "Vikram Reddy", "Meena Nair", "Arjun Mehta", "Kavya Iyer",
  "Suresh Yadav", "Pooja Verma", "Deepak Joshi", "Neha Agarwal", "Rohan Das",
  "Lakshmi Rao", "Manish Tiwari", "Divya Menon", "Karan Malhotra", "Sneha Pillai",
];

function bedStatusFor(index: number, occupiedTarget: number, totalBeds: number): BedStatus {
  if (index < occupiedTarget) return "Occupied";
  // Sprinkle a little operational realism into the remaining free beds.
  const freeIndex = index - occupiedTarget;
  const free = totalBeds - occupiedTarget;
  if (free > 4 && freeIndex === free - 1) return "Maintenance";
  if (free > 2 && freeIndex === free - 2) return "Cleaning";
  return "Available";
}

/** Derive a room's status from the statuses of the beds it contains. */
function roomStatusFrom(bedStatuses: BedStatus[]): RoomStatus {
  if (bedStatuses.some((s) => s === "Maintenance")) return "Maintenance";
  if (bedStatuses.some((s) => s === "Cleaning")) return "Cleaning";
  if (bedStatuses.length > 0 && bedStatuses.every((s) => s === "Occupied")) return "Occupied";
  return "Available";
}

async function main() {
  console.log("🌱 Seeding Room / Bed module...");

  // ── Reset (cascade covers children, but be explicit & order-safe) ──────────
  await prisma.bed.deleteMany();
  await prisma.room.deleteMany();
  await prisma.roomCategory.deleteMany();

  for (const bp of BLUEPRINTS) {
    const totalBeds = bp.totalRooms * bp.bedsPerRoom;

    // Build the rooms + beds tree with a running bed index so occupancy is
    // distributed deterministically across the whole category. Tally the real
    // per-status counts as we go so the aggregate counters match the beds
    // exactly (Available excludes Cleaning/Maintenance).
    let bedIndex = 0;
    let patientCursor = 0;
    let occupiedTally = 0;
    let availableTally = 0;

    const rooms = Array.from({ length: bp.totalRooms }, (_, r) => {
      const roomNumber = `${bp.prefix}-${101 + r}`;
      const bedStatuses: BedStatus[] = [];

      const beds = Array.from({ length: bp.bedsPerRoom }, (_, b) => {
        const status = bedStatusFor(bedIndex, bp.occupiedTarget, totalBeds);
        bedIndex += 1;
        bedStatuses.push(status);
        if (status === "Occupied") occupiedTally += 1;
        else if (status === "Available") availableTally += 1;
        const patientName =
          status === "Occupied"
            ? PATIENT_NAMES[patientCursor++ % PATIENT_NAMES.length]
            : null;
        return {
          bedNumber: `${roomNumber}-B${b + 1}`,
          status,
          patientName,
        };
      });

      return {
        roomNumber,
        status: roomStatusFrom(bedStatuses),
        beds: { create: beds },
      };
    });

    const { occupiedBeds, availableBeds, occupancyPercentage } = computeOccupancy(
      totalBeds,
      occupiedTally,
      availableTally,
    );

    await prisma.roomCategory.create({
      data: {
        roomType: bp.roomType,
        totalRooms: bp.totalRooms,
        bedsPerRoom: bp.bedsPerRoom,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyPercentage,
        rooms: { create: rooms },
      },
    });

    console.log(
      `  ✓ ${bp.roomType.padEnd(24)} ${bp.totalRooms} rooms / ${totalBeds} beds · ${occupancyPercentage}% occupied`,
    );
  }

  const [cats, roomCount, bedCount] = await Promise.all([
    prisma.roomCategory.count(),
    prisma.room.count(),
    prisma.bed.count(),
  ]);
  console.log(`✅ Done: ${cats} categories, ${roomCount} rooms, ${bedCount} beds.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
