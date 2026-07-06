"use client";

import { statusColor } from "@/lib/rooms";

/** A small pill showing a room/bed status in its themed colour. */
export function StatusBadge({ status }: { status: string }) {
  const { bg, fg } = statusColor(status);
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 12px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.5,
        background: bg,
        color: fg,
        whiteSpace: "nowrap",
      }}
    >
      {status}
    </span>
  );
}
