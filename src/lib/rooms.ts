/**
 * Shared domain constants & helpers for the Room / Bed module.
 *
 * SQLite has no native enum type, so room & bed statuses are stored as plain
 * strings. These constants are the single source of truth for the allowed
 * values and are reused across the seed script, API routes and UI components.
 *
 * This file is framework-agnostic (no React, no Prisma imports) so it can be
 * safely imported from client components, server routes and the seed script.
 */

// ── Status values ────────────────────────────────────────────────────────────
export const ROOM_STATUSES = [
  "Available",
  "Occupied",
  "Cleaning",
  "Maintenance",
] as const;

export const BED_STATUSES = [
  "Available",
  "Occupied",
  "Cleaning",
  "Maintenance",
] as const;

export type RoomStatus = (typeof ROOM_STATUSES)[number];
export type BedStatus = (typeof BED_STATUSES)[number];

export const isRoomStatus = (v: string): v is RoomStatus =>
  (ROOM_STATUSES as readonly string[]).includes(v);

export const isBedStatus = (v: string): v is BedStatus =>
  (BED_STATUSES as readonly string[]).includes(v);

// ── Occupancy maths ──────────────────────────────────────────────────────────
/**
 * Derive the aggregate capacity counters for a RoomCategory.
 *
 * `availableBeds` counts ONLY beds whose status is exactly "Available" — beds in
 * Cleaning, Maintenance or Occupied are deliberately excluded. Because available
 * can no longer be inferred from `totalBeds - occupiedBeds` (that would wrongly
 * include Cleaning/Maintenance beds), callers must pass the real count of
 * Available-status beds. Kept in one place so the seed, API and UI never disagree.
 */
export function computeOccupancy(
  totalBeds: number,
  occupiedBeds: number,
  availableBeds: number,
) {
  const safeOccupied = Math.max(0, Math.min(occupiedBeds, totalBeds));
  // Available beds can never exceed the beds that aren't occupied.
  const safeAvailable = Math.max(
    0,
    Math.min(availableBeds, totalBeds - safeOccupied),
  );
  const occupancyPercentage =
    totalBeds > 0
      ? parseFloat(((safeOccupied / totalBeds) * 100).toFixed(1))
      : 0;
  return {
    occupiedBeds: safeOccupied,
    availableBeds: safeAvailable,
    occupancyPercentage,
  };
}

/** Derive a room's status from the statuses of the beds it contains. */
export function deriveRoomStatus(bedStatuses: string[]): RoomStatus {
  if (bedStatuses.some((s) => s === "Maintenance")) return "Maintenance";
  if (bedStatuses.some((s) => s === "Cleaning")) return "Cleaning";
  if (bedStatuses.length > 0 && bedStatuses.every((s) => s === "Occupied")) return "Occupied";
  return "Available";
}

// ── UI theming helpers (brand-consistent, reusable) ─────────────────────────
/** Accent colour for a bed/room status chip. Aligns with the existing theme. */
export function statusColor(status: string): { bg: string; fg: string } {
  switch (status) {
    case "Available":
      return { bg: "#10b981", fg: "#ffffff" };
    case "Occupied":
      return { bg: "#ef4444", fg: "#ffffff" };
    case "Cleaning":
      return { bg: "#3b82f6", fg: "#ffffff" };
    case "Maintenance":
      return { bg: "#f59e0b", fg: "#000000" };
    default:
      return { bg: "rgba(255,255,255,0.12)", fg: "#ffffff" };
  }
}

/** Colour for an occupancy bar: green under load, category accent mid, red high. */
export function occupancyColor(percent: number, accent: string): string {
  if (percent > 80) return "#ef4444";
  if (percent > 60) return accent;
  return "#10b981";
}
