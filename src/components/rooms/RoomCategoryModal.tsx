"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Column, Row, Text, Heading, Button, Line, useToast } from "@once-ui-system/core";
import { OccupancyBar } from "./OccupancyBar";
import { StatusBadge } from "./StatusBadge";
import { BedEditModal } from "./BedEditModal";
import { categoryVisual } from "./visuals";
import { deriveRoomStatus } from "@/lib/rooms";
import type { BedDTO, RoomCategoryDTO, RoomCategoryDetailDTO } from "./types";

/** Format an ISO timestamp for the "Last Updated" column. */
function formatUpdated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Room / bed details for a category. Shows every room with its beds in a table
 * (Bed Number · Status · Patient · Last Updated) and an Edit button per bed.
 * All statistics are derived live from the bed records; editing a bed updates
 * this view in place (no refetch) and refreshes the parent grid.
 */
export function RoomCategoryModal({
  categoryId,
  onClose,
  onUpdated,
}: {
  categoryId: string;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const { addToast } = useToast();
  const [detail, setDetail] = useState<RoomCategoryDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBed, setEditingBed] = useState<{ bed: BedDTO; roomNumber: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${categoryId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setDetail(json.data as RoomCategoryDetailDTO);
    } catch (err) {
      console.error(err);
      addToast({ variant: "danger", message: "Could not load room details." });
    } finally {
      setLoading(false);
    }
  }, [categoryId, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Stats derived straight from the bed records ───────────────────────────
  const stats = useMemo(() => {
    const beds = detail ? detail.rooms.flatMap((r) => r.beds) : [];
    const by = (s: string) => beds.filter((b) => b.status === s).length;
    const totalBeds = beds.length;
    const occupied = by("Occupied");
    return {
      totalRooms: detail?.rooms.length ?? 0,
      totalBeds,
      occupied,
      available: by("Available"),
      cleaning: by("Cleaning"),
      maintenance: by("Maintenance"),
      occupancy: totalBeds > 0 ? parseFloat(((occupied / totalBeds) * 100).toFixed(1)) : 0,
    };
  }, [detail]);

  // Apply an edited bed to local state so the view updates without a refetch.
  const handleBedSaved = useCallback(
    (updatedBed: BedDTO, _category: RoomCategoryDTO) => {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              rooms: prev.rooms.map((r) =>
                r.id === updatedBed.roomId
                  ? { ...r, beds: r.beds.map((b) => (b.id === updatedBed.id ? updatedBed : b)) }
                  : r,
              ),
            }
          : prev,
      );
      onUpdated?.();
    },
    [onUpdated],
  );

  const visual = detail ? categoryVisual(detail.roomType) : null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        padding: "16px",
      }}
    >
      <Column
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        padding="32"
        gap="20"
        style={{
          background: "var(--surface-background)",
          border: "1px solid var(--neutral-border-medium)",
          borderRadius: "20px",
          width: "min(820px, 96vw)",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        {/* header */}
        <Row horizontal="between" vertical="center">
          <Row gap="12" vertical="center">
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: visual?.gradient ?? "var(--neutral-alpha-medium)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              {visual?.icon ?? "🏨"}
            </div>
            <Heading variant="heading-strong-l">{detail?.roomType ?? "Loading…"}</Heading>
          </Row>
          <div
            onClick={onClose}
            style={{ cursor: "pointer", fontSize: "22px", opacity: 0.6, padding: "4px 8px" }}
          >
            ✕
          </div>
        </Row>

        <Line background="neutral-alpha-weak" />

        {loading || !detail ? (
          <Text variant="body-default-m" onBackground="neutral-weak" style={{ padding: "24px 0" }}>
            Loading rooms &amp; beds…
          </Text>
        ) : (
          <>
            {/* summary — all values derived from the bed records */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
              {[
                { label: "Rooms", value: stats.totalRooms, color: "var(--neutral-on-background-strong)" },
                { label: "Total Beds", value: stats.totalBeds, color: "var(--neutral-on-background-strong)" },
                { label: "Occupied", value: stats.occupied, color: "#ef4444" },
                { label: "Available", value: stats.available, color: "#10b981" },
                { label: "Cleaning", value: stats.cleaning, color: "#3b82f6" },
                { label: "Maintenance", value: stats.maintenance, color: "#f59e0b" },
              ].map((s) => (
                <Column
                  key={s.label}
                  padding="12"
                  gap="4"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {s.label}
                  </Text>
                  <Text variant="heading-strong-m" style={{ color: s.color }}>
                    {s.value}
                  </Text>
                </Column>
              ))}
            </div>

            <Column gap="8">
              <Row horizontal="between">
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Occupancy Rate
                </Text>
                <Text variant="label-strong-s" style={{ color: visual?.accent }}>
                  {stats.occupancy}%
                </Text>
              </Row>
              <OccupancyBar percent={stats.occupancy} accent={visual?.accent} />
            </Column>

            <Text variant="body-default-s" onBackground="neutral-weak">
              Manage each bed individually — set its status, assign a patient, or add notes.
            </Text>

            {/* rooms + bed tables */}
            <Column gap="12">
              {detail.rooms.map((room) => {
                const roomStatus = deriveRoomStatus(room.beds.map((b) => b.status));
                return (
                  <Column
                    key={room.id}
                    padding="16"
                    gap="12"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.06)",
                      borderRadius: "14px",
                    }}
                  >
                    <Row horizontal="between" vertical="center">
                      <Text variant="heading-strong-s">Room {room.roomNumber}</Text>
                      <StatusBadge status={roomStatus} />
                    </Row>

                    {/* table header */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.4fr 1fr 1.6fr 1.4fr auto",
                        gap: "8px",
                        padding: "0 4px",
                      }}
                    >
                      {["Bed", "Status", "Patient", "Last Updated", ""].map((h, i) => (
                        <Text
                          key={i}
                          variant="label-strong-s"
                          onBackground="neutral-weak"
                          style={{ textAlign: i === 4 ? "right" : "left" }}
                        >
                          {h}
                        </Text>
                      ))}
                    </div>

                    {/* bed rows */}
                    {room.beds.map((bed) => (
                      <div
                        key={bed.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1.6fr 1.4fr auto",
                          gap: "8px",
                          alignItems: "center",
                          padding: "8px 4px",
                          borderTop: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <Text variant="body-default-s" onBackground="neutral-strong">
                          {bed.bedNumber.split("-").pop()}
                        </Text>
                        <div>
                          <StatusBadge status={bed.status} />
                        </div>
                        <Text variant="body-default-s" onBackground="neutral-medium">
                          {bed.patientName ?? "—"}
                        </Text>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {formatUpdated(bed.updatedAt)}
                        </Text>
                        <div style={{ textAlign: "right" }}>
                          <Button
                            variant="secondary"
                            size="s"
                            prefixIcon="edit"
                            onClick={() => setEditingBed({ bed, roomNumber: room.roomNumber })}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </Column>
                );
              })}
            </Column>

            <Button variant="secondary" size="m" fillWidth onClick={onClose}>
              Close
            </Button>
          </>
        )}
      </Column>

      {/* per-bed editor */}
      {editingBed && (
        <BedEditModal
          bed={editingBed.bed}
          roomNumber={editingBed.roomNumber}
          onClose={() => setEditingBed(null)}
          onSaved={handleBedSaved}
        />
      )}
    </div>
  );
}
