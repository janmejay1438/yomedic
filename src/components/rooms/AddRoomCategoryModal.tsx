"use client";

import { useState } from "react";
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

export function AddRoomCategoryModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { addToast } = useToast();
  const [roomType, setRoomType] = useState("");
  const [totalRooms, setTotalRooms] = useState(1);
  const [bedsPerRoom, setBedsPerRoom] = useState(1);
  const [saving, setSaving] = useState(false);

  const isValid = roomType.trim().length > 0 && totalRooms >= 1 && bedsPerRoom >= 1;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomType: roomType.trim(),
          totalRooms,
          bedsPerRoom,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create category.");
      }

      addToast({
        variant: "success",
        message: `Created room category "${roomType.trim()}" successfully.`,
      });
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      addToast({
        variant: "danger",
        message: err.message || "Failed to create room category.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <Column
        gap="24"
        padding="32"
        background="surface"
        border="neutral-alpha-weak"
        radius="l"
        style={{
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Column gap="8">
          <Heading variant="heading-strong-l">Create Room Category</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Specify the name, number of rooms, and beds per room.
          </Text>
        </Column>

        <Line background="neutral-alpha-weak" />

        <Column gap="16">
          <Column gap="8">
            <Text variant="label-strong-s" onBackground="neutral-weak">
              Room Type Name
            </Text>
            <input
              type="text"
              placeholder="e.g. Intensive Care Unit (ICU)"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "10px",
                border: "1px solid var(--neutral-border-medium)",
                background: "rgba(255, 255, 255, 0.03)",
                color: "var(--neutral-on-background-strong)",
                fontSize: "14px",
                outline: "none",
              }}
            />
          </Column>

          <Row gap="16" wrap>
            <Column gap="4" style={{ flex: 1, minWidth: "180px" }}>
              <NumberInput
                id="add-total-rooms"
                label="Total Rooms"
                value={totalRooms}
                min={1}
                max={500}
                step={1}
                onChange={(v) => setTotalRooms(Number.isFinite(v) ? Math.trunc(v) : 1)}
              />
            </Column>
            <Column gap="4" style={{ flex: 1, minWidth: "180px" }}>
              <NumberInput
                id="add-beds-per-room"
                label="Beds Per Room"
                value={bedsPerRoom}
                min={1}
                max={20}
                step={1}
                onChange={(v) => setBedsPerRoom(Number.isFinite(v) ? Math.trunc(v) : 1)}
              />
            </Column>
          </Row>
        </Column>

        <Line background="neutral-alpha-weak" />

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
            {saving ? "Creating…" : "Create Category"}
          </Button>
        </Row>
      </Column>
    </div>
  );
}
