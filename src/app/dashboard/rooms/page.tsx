"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  Column,
  Row,
  Text,
  Heading,
  Button,
  RevealFx,
  Badge,
  Line,
} from "@once-ui-system/core";
import {
  RoomCategoryCard,
  RoomCategoryModal,
  EditRoomCategoryModal,
  AddRoomCategoryModal,
} from "@/components/rooms";
import type { RoomCategoryDTO } from "@/components/rooms";

/**
 * Room & Bed Management — live, Prisma/SQLite-backed capacity dashboard.
 * Reachable from the Facility Dashboard. Mirrors the existing dashboard auth
 * guard and visual theme so it slots in without disrupting anything.
 */
export default function RoomsManagementPage() {
  const router = useRouter();
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<{ email: string | null } | null>(null);

  const [categories, setCategories] = useState<RoomCategoryDTO[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<RoomCategoryDTO | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // ── Auth guard (same pattern as the facility dashboard) ───────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoadingAuth(false);
      } else {
        router.push("/login/hospital");
      }
    });
    return () => unsub();
  }, [router]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/rooms", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setCategories(json.data as RoomCategoryDTO[]);
    } catch (err) {
      console.error("Failed to load room categories:", err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth && user) loadCategories();
  }, [loadingAuth, user, loadCategories]);

  // Patch a single category in place so the grid updates instantly after an
  // edit — no full refetch or page reload needed.
  const applyUpdatedCategory = useCallback((updated: RoomCategoryDTO) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
    );
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login/hospital");
  };

  // ── Facility-wide totals ─────────────────────────────────────────────────
  const totals = categories.reduce(
    (acc, c) => {
      acc.rooms += c.totalRooms;
      acc.beds += c.totalBeds;
      acc.occupied += c.occupiedBeds;
      acc.available += c.availableBeds;
      return acc;
    },
    { rooms: 0, beds: 0, occupied: 0, available: 0 },
  );
  const overallPct =
    totals.beds > 0
      ? parseFloat(((totals.occupied / totals.beds) * 100).toFixed(1))
      : 0;

  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: "100vh" }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">
          Authenticating...
        </Text>
      </Column>
    );
  }

  return (
    <Column
      fillWidth
      paddingX="l"
      paddingY="xl"
      gap="32"
      style={{ maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}
    >
      {/* Header */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Row gap="12" vertical="center">
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "14px",
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              🛏️
            </div>
            <Column gap="2">
              <Heading variant="display-strong-s">Room &amp; Bed Management</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Live capacity across all room categories
              </Text>
            </Column>
          </Row>
          <Row gap="16" vertical="center">
            <Button variant="secondary" size="s" href="/dashboard/hospital">
              ← Dashboard
            </Button>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              Sign Out
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Facility totals */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Row
          fillWidth
          padding="24"
          gap="16"
          wrap
          horizontal="between"
          vertical="center"
          style={{
            background: "var(--surface-background)",
            border: "1px solid var(--neutral-border-medium)",
            borderRadius: "16px",
          }}
        >
          {[
            { label: "Total Rooms", value: totals.rooms, color: "var(--neutral-on-background-strong)" },
            { label: "Total Beds", value: totals.beds, color: "var(--neutral-on-background-strong)" },
            { label: "Occupied Beds", value: totals.occupied, color: "#ef4444" },
            { label: "Available Beds", value: totals.available, color: "#10b981" },
            { label: "Overall Occupancy", value: `${overallPct}%`, color: "#6366f1" },
          ].map((s) => (
            <Column key={s.label} gap="4" style={{ minWidth: "120px" }}>
              <Text variant="label-default-s" onBackground="neutral-weak">
                {s.label}
              </Text>
              <Text variant="display-strong-s" style={{ color: s.color }}>
                {s.value}
              </Text>
            </Column>
          ))}
        </Row>
      </RevealFx>

      {/* Category grid */}
      <RevealFx translateY="12" delay={0.15} fillWidth>
        <Column fillWidth gap="20">
          <Row horizontal="between" vertical="center">
            <Row gap="12" vertical="center">
              <Heading variant="heading-strong-l">Room Categories</Heading>
              {!loadingData && (
                <Badge background="brand-alpha-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  {categories.length} categories
                </Badge>
              )}
            </Row>
            <Button id="add-category-btn" variant="primary" size="s" onClick={() => setIsAddingCategory(true)}>
              + Add Category
            </Button>
          </Row>

          {loadingData ? (
            <Text variant="body-default-m" onBackground="neutral-weak">
              Loading room data…
            </Text>
          ) : categories.length === 0 ? (
            <Column
              padding="32"
              horizontal="center"
              gap="8"
              style={{
                background: "var(--surface-background)",
                border: "1px dashed var(--neutral-border-medium)",
                borderRadius: "16px",
              }}
            >
              <Text variant="heading-strong-s">No room data yet</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Run <code>npx prisma db seed</code> to populate the database.
              </Text>
            </Column>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                width: "100%",
              }}
            >
              {categories.map((c) => (
                <RoomCategoryCard
                  key={c.id}
                  category={c}
                  onClick={() => setSelectedId(c.id)}
                  onEdit={() => setEditing(c)}
                />
              ))}
            </div>
          )}
        </Column>
      </RevealFx>

      {/* Detail modal */}
      {selectedId && (
        <RoomCategoryModal
          categoryId={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdated={loadCategories}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EditRoomCategoryModal
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={applyUpdatedCategory}
        />
      )}

      {/* Add modal */}
      {isAddingCategory && (
        <AddRoomCategoryModal
          onClose={() => setIsAddingCategory(false)}
          onSaved={loadCategories}
        />
      )}
    </Column>
  );
}
