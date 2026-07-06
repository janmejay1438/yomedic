"use client";

import { useState } from "react";
import {
  Column,
  Row,
  Text,
  Heading,
  Button,
  Line,
  Input,
  SegmentedControl,
  useToast,
} from "@once-ui-system/core";
import { BED_STATUSES, statusColor, type BedStatus } from "@/lib/rooms";
import type { BedDTO, RoomCategoryDTO } from "./types";

/**
 * Edit a single bed manually: status, patient name and optional notes. Persists
 * via PATCH /api/rooms/beds/[id] and hands the updated bed + fresh category
 * counters back to the parent so the UI updates in place (no page refresh).
 */
export function BedEditModal({
  bed,
  roomNumber,
  onClose,
  onSaved,
}: {
  bed: BedDTO;
  roomNumber: string;
  onClose: () => void;
  onSaved?: (updatedBed: BedDTO, category: RoomCategoryDTO) => void;
}) {
  const { addToast } = useToast();
  const [status, setStatus] = useState<BedStatus>(bed.status as BedStatus);
  const [patientName, setPatientName] = useState(bed.patientName ?? "");
  const [notes, setNotes] = useState(bed.notes ?? "");
  const [saving, setSaving] = useState(false);

  const isOccupied = status === "Occupied";
  const accent = statusColor(status).bg;

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/rooms/beds/${bed.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          patientName: isOccupied ? patientName.trim() : null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      addToast({ variant: "success", message: `Bed ${bed.bedNumber} updated.` });
      onSaved?.(json.data.bed as BedDTO, json.data.category as RoomCategoryDTO);
      onClose();
    } catch (err) {
      console.error(err);
      addToast({
        variant: "danger",
        message: err instanceof Error ? err.message : "Could not save bed.",
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
        zIndex: 10001,
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
          width: "min(460px, 96vw)",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        {/* header */}
        <Row horizontal="between" vertical="center">
          <Column gap="2">
            <Heading variant="heading-strong-l">Edit Bed</Heading>
            <Text variant="label-default-s" onBackground="neutral-weak">
              Room {roomNumber} · {bed.bedNumber}
            </Text>
          </Column>
          <div
            onClick={onClose}
            style={{ cursor: "pointer", fontSize: "22px", opacity: 0.6, padding: "4px 8px" }}
          >
            ✕
          </div>
        </Row>

        <Line background="neutral-alpha-weak" />

        {/* status */}
        <Column gap="8" fillWidth>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Bed Status
          </Text>
          <SegmentedControl
            fillWidth
            selected={status}
            onToggle={(v) => setStatus(v as BedStatus)}
            buttons={BED_STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </Column>

        {/* patient name — only relevant when occupied */}
        <Column gap="4" fillWidth>
          <Input
            id={`bed-patient-${bed.id}`}
            label="Patient Name"
            value={patientName}
            disabled={!isOccupied}
            placeholder={isOccupied ? "e.g. Ravi Kumar" : "Available for occupancy"}
            description={
              isOccupied ? undefined : "Set status to Occupied to assign a patient."
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPatientName(e.target.value)
            }
          />
        </Column>

        {/* notes */}
        <Column gap="8" fillWidth>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Notes (optional)
          </Text>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any operational notes for this bed…"
            rows={3}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "1px solid var(--neutral-border-medium)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--neutral-on-background-strong)",
              fontSize: "14px",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
            }}
          />
        </Column>

        {/* current status chip preview */}
        <Row gap="8" vertical="center">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Will be saved as:
          </Text>
          <span
            style={{
              display: "inline-block",
              padding: "3px 12px",
              borderRadius: "20px",
              fontSize: "11px",
              fontWeight: 600,
              background: accent,
              color: statusColor(status).fg,
            }}
          >
            {status}
          </span>
        </Row>

        <Line background="neutral-alpha-weak" />

        {/* actions */}
        <Row gap="12" fillWidth>
          <Button variant="secondary" size="m" fillWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="m" fillWidth onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Bed"}
          </Button>
        </Row>
      </Column>
    </div>
  );
}
