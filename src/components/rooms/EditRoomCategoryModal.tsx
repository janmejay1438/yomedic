"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Column,
  Row,
  Text,
  Heading,
  Button,
  Line,
  NumberInput,
  useToast,
} from "@once-ui-system/core";
import { OccupancyBar } from "./OccupancyBar";
import { categoryVisual } from "./visuals";
import { computeOccupancy } from "@/lib/rooms";
import type { RoomCategoryDTO, RoomCategoryDetailDTO } from "./types";

const MAX_ROOMS = 500;
const MAX_BEDS_PER_ROOM = 20;

/**
 * Capacity editor for a room category — Total Rooms and Beds Per Room only.
 * Occupancy is derived from the beds and preserved, so it isn't edited here.
 * The modal loads the category's beds to validate that a reduction would never
 * require deleting an occupied room or bed (the server enforces the same rules).
 */
export function EditRoomCategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: RoomCategoryDTO;
  onClose: () => void;
  onSaved?: (updated: RoomCategoryDTO) => void;
}) {
  const { addToast } = useToast();
  const visual = categoryVisual(category.roomType);

  const [totalRooms, setTotalRooms] = useState<number>(category.totalRooms);
  const [bedsPerRoom, setBedsPerRoom] = useState<number>(category.bedsPerRoom);
  const [saving, setSaving] = useState(false);

  // Load current beds so we can validate reductions precisely.
  const [detail, setDetail] = useState<RoomCategoryDetailDTO | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/rooms/${category.id}`, { cache: "no-store" });
        const json = await res.json();
        if (active && res.ok) setDetail(json.data as RoomCategoryDetailDTO);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingDetail(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [category.id]);

  // Occupancy facts derived from the live beds.
  const occupancy = useMemo(() => {
    const rooms = detail?.rooms ?? [];
    const occupiedPerRoom = rooms.map((r) => r.beds.filter((b) => b.status === "Occupied").length);
    return {
      occupiedRooms: occupiedPerRoom.filter((n) => n > 0).length,
      maxOccupiedPerRoom: occupiedPerRoom.reduce((m, n) => Math.max(m, n), 0),
      occupiedBeds: occupiedPerRoom.reduce((sum, n) => sum + n, 0),
    };
  }, [detail]);

  // ── Live-derived preview ──────────────────────────────────────────────────
  const totalBeds = Math.max(0, totalRooms) * Math.max(0, bedsPerRoom);
  const derived = useMemo(
    () => computeOccupancy(totalBeds, occupancy.occupiedBeds, totalBeds - occupancy.occupiedBeds),
    [totalBeds, occupancy.occupiedBeds],
  );

  // ── Validation ────────────────────────────────────────────────────────────
  const errors: Partial<Record<"totalRooms" | "bedsPerRoom", string>> = {};
  if (!Number.isInteger(totalRooms) || totalRooms < 1) errors.totalRooms = "Enter at least 1 room.";
  else if (totalRooms > MAX_ROOMS) errors.totalRooms = `Max ${MAX_ROOMS} rooms.`;
  else if (detail && totalRooms < occupancy.occupiedRooms)
    errors.totalRooms = `Can't go below ${occupancy.occupiedRooms} — that many rooms are occupied.`;

  if (!Number.isInteger(bedsPerRoom) || bedsPerRoom < 1) errors.bedsPerRoom = "Enter at least 1 bed.";
  else if (bedsPerRoom > MAX_BEDS_PER_ROOM) errors.bedsPerRoom = `Max ${MAX_BEDS_PER_ROOM} beds per room.`;
  else if (detail && bedsPerRoom < occupancy.maxOccupiedPerRoom)
    errors.bedsPerRoom = `Can't go below ${occupancy.maxOccupiedPerRoom} — a room has that many occupied beds.`;

  const isValid = !loadingDetail && Object.keys(errors).length === 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalRooms, bedsPerRoom }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      addToast({ variant: "success", message: `${category.roomType} updated.` });
      onSaved?.(json.data as RoomCategoryDTO);
      onClose();
    } catch (err) {
      console.error(err);
      addToast({
        variant: "danger",
        message: err instanceof Error ? err.message : "Could not save changes.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
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
          width: "min(560px, 96vw)",
          maxHeight: "90vh",
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
                background: visual.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "22px",
              }}
            >
              {visual.icon}
            </div>
            <Column gap="2">
              <Heading variant="heading-strong-l">Edit {category.roomType}</Heading>
              <Text variant="label-default-s" onBackground="neutral-weak">
                Capacity — occupancy is preserved
              </Text>
            </Column>
          </Row>
          <div
            onClick={onClose}
            style={{ cursor: "pointer", fontSize: "22px", opacity: 0.6, padding: "4px 8px" }}
          >
            ✕
          </div>
        </Row>

        <Line background="neutral-alpha-weak" />

        {/* editable fields */}
        <Row gap="16" fillWidth wrap>
          <Column gap="4" style={{ flex: 1, minWidth: "180px" }}>
            <NumberInput
              id="edit-total-rooms"
              label="Total Rooms"
              value={totalRooms}
              min={1}
              max={MAX_ROOMS}
              step={1}
              error={!!errors.totalRooms}
              errorMessage={errors.totalRooms}
              onChange={(v) => setTotalRooms(Number.isFinite(v) ? Math.trunc(v) : 0)}
            />
          </Column>
          <Column gap="4" style={{ flex: 1, minWidth: "180px" }}>
            <NumberInput
              id="edit-beds-per-room"
              label="Beds Per Room"
              value={bedsPerRoom}
              min={1}
              max={MAX_BEDS_PER_ROOM}
              step={1}
              error={!!errors.bedsPerRoom}
              errorMessage={errors.bedsPerRoom}
              onChange={(v) => setBedsPerRoom(Number.isFinite(v) ? Math.trunc(v) : 0)}
            />
          </Column>
        </Row>

        <Text variant="body-default-s" onBackground="neutral-weak">
          Increasing capacity adds empty rooms/beds. Decreasing removes only empty
          ones — occupied rooms and beds are never deleted.
        </Text>

        <Line background="neutral-alpha-weak" />

        {/* live derived preview */}
        <Column
          gap="12"
          padding="16"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "14px",
          }}
        >
          <Text variant="label-strong-s" onBackground="neutral-weak">
            Auto-calculated
          </Text>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" }}>
            {[
              { label: "Total Beds", value: totalBeds, color: "var(--neutral-on-background-strong)" },
              { label: "Occupied", value: occupancy.occupiedBeds, color: "#ef4444" },
              { label: "Available", value: derived.availableBeds, color: "#10b981" },
              { label: "Occupancy", value: `${derived.occupancyPercentage}%`, color: visual.accent },
            ].map((s) => (
              <Column key={s.label} gap="4">
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {s.label}
                </Text>
                <Text variant="heading-strong-m" style={{ color: s.color }}>
                  {s.value}
                </Text>
              </Column>
            ))}
          </div>
          <OccupancyBar percent={derived.occupancyPercentage} accent={visual.accent} />
        </Column>

        {/* actions */}
        <Row gap="12" fillWidth>
          <Button variant="secondary" size="m" fillWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="m"
            fillWidth
            onClick={handleSave}
            disabled={!isValid || saving}
          >
            {saving ? "Saving…" : loadingDetail ? "Loading…" : "Save Changes"}
          </Button>
        </Row>
      </Column>
    </div>
  );
}
