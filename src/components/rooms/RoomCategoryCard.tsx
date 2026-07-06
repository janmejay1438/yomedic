"use client";

import { Column, Row, Text, Line, Button } from "@once-ui-system/core";
import { OccupancyBar } from "./OccupancyBar";
import { categoryVisual } from "./visuals";
import type { RoomCategoryDTO } from "./types";

/**
 * A single room-category summary card. Presentational + reusable: it takes a
 * category DTO and an onClick, and renders capacity + occupancy in the same
 * visual style as the rest of the facility dashboard. An optional `onEdit`
 * surfaces an Edit button that opens the capacity editor without triggering the
 * card's own click (detail) handler.
 */
export function RoomCategoryCard({
  category,
  onClick,
  onEdit,
}: {
  category: RoomCategoryDTO;
  onClick?: (category: RoomCategoryDTO) => void;
  onEdit?: (category: RoomCategoryDTO) => void;
}) {
  const visual = categoryVisual(category.roomType);

  return (
    <Column
      padding="24"
      gap="16"
      onClick={() => onClick?.(category)}
      style={{
        background: "var(--surface-background)",
        border: "1px solid var(--neutral-border-medium)",
        borderRadius: "20px",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.25s ease, box-shadow 0.25s ease",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* accent top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: visual.gradient,
        }}
      />

      <Row gap="12" vertical="center" paddingTop="4" horizontal="between">
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
            <Text variant="heading-strong-m">{category.roomType}</Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              {category.availableBeds} available of {category.totalBeds} beds
            </Text>
          </Column>
        </Row>
        {onEdit && (
          <Button
            variant="secondary"
            size="s"
            prefixIcon="edit"
            onClick={(e: React.MouseEvent) => {
              // Don't let the click bubble to the card's detail handler.
              e.stopPropagation();
              onEdit(category);
            }}
          >
            Edit
          </Button>
        )}
      </Row>

      {/* mini stats */}
      <Row gap="8" fillWidth>
        {[
          { label: "Rooms", value: category.totalRooms },
          { label: "Beds", value: category.totalBeds },
          { label: "Occupied", value: category.occupiedBeds },
        ].map((s) => (
          <Column
            key={s.label}
            gap="2"
            style={{ flex: 1 }}
          >
            <Text variant="label-default-s" onBackground="neutral-weak">
              {s.label}
            </Text>
            <Text variant="heading-strong-s">{s.value}</Text>
          </Column>
        ))}
      </Row>

      {/* occupancy */}
      <Column gap="8">
        <Row horizontal="between">
          <Text variant="label-default-s" onBackground="neutral-weak">
            Occupancy
          </Text>
          <Text variant="label-strong-s" style={{ color: visual.accent }}>
            {category.occupancyPercentage}%
          </Text>
        </Row>
        <OccupancyBar percent={category.occupancyPercentage} accent={visual.accent} />
      </Column>

      <Line background="neutral-alpha-weak" />
      <Text variant="label-default-s" onBackground="brand-medium">
        View Rooms &amp; Beds →
      </Text>
    </Column>
  );
}
