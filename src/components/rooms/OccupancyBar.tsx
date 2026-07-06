"use client";

import { occupancyColor } from "@/lib/rooms";

/**
 * A thin, animated occupancy progress bar. Green when there is spare capacity,
 * the category accent in the mid range, and red when nearly full.
 */
export function OccupancyBar({
  percent,
  accent = "#6366f1",
}: {
  percent: number;
  accent?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      style={{
        width: "100%",
        height: "10px",
        borderRadius: "5px",
        background: "rgba(255,255,255,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: "100%",
          borderRadius: "5px",
          background: occupancyColor(clamped, accent),
          transition: "width 0.6s ease",
        }}
      />
    </div>
  );
}
