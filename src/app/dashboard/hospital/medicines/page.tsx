"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
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
  Icon,
} from "@once-ui-system/core";
import styles from "./medicines.module.scss";

/* ------------------------------------------------------------------ */
/* Types & domain helpers                                              */
/* ------------------------------------------------------------------ */

export interface Medicine {
  id: string;
  name: string;
  category: "tablet" | "syrup" | "injection" | "capsule";
  arrival_date: string;
  stock_arrived: number;
  stock_left: number;
  expiry_date: string;
  updated_at: string;
}

export function usedRatio(m: Medicine) {
  if (!m.stock_arrived) return 0;
  return (m.stock_arrived - m.stock_left) / m.stock_arrived;
}
export const isCritical = (m: Medicine) => usedRatio(m) > 0.75;
export const isLow = (m: Medicine) => usedRatio(m) >= 0.5 && usedRatio(m) <= 0.75;
export function daysToExpiry(m: Medicine) {
  return Math.ceil((new Date(m.expiry_date).getTime() - Date.now()) / 86400000);
}
export const isExpiringSoon = (m: Medicine) => daysToExpiry(m) <= 30 && daysToExpiry(m) >= 0;
export const isExpired = (m: Medicine) => daysToExpiry(m) < 0;

// Green < 50% used, Yellow 50–75%, Red > 75%
export function stockDotColor(m: Medicine): "green" | "yellow" | "red" {
  const r = usedRatio(m);
  if (r > 0.75) return "red";
  if (r >= 0.5) return "yellow";
  return "green";
}

const CATEGORY_ORDER: Medicine["category"][] = ["tablet", "syrup", "injection", "capsule"];
const CATEGORY_LABEL: Record<Medicine["category"], string> = {
  tablet: "Tablets",
  syrup: "Syrups",
  injection: "Injections",
  capsule: "Capsules",
};

type FilterKey = "all" | "low" | "critical" | "expiring" | "expired";
const FILTERS: Record<FilterKey, { label: string; test: (m: Medicine) => boolean }> = {
  all: { label: "All Medicines", test: () => true },
  low: { label: "Low Stock", test: isLow },
  critical: { label: "Critical Stock", test: isCritical },
  expiring: { label: "Expiring Soon", test: (m) => !isExpired(m) && isExpiringSoon(m) },
  expired: { label: "Expired", test: isExpired },
};

type SortKey = "az" | "newest" | "oldest" | "lowStock" | "highStock";
const SORTS: Record<SortKey, (a: Medicine, b: Medicine) => number> = {
  az: (a, b) => a.name.localeCompare(b.name),
  newest: (a, b) => b.arrival_date.localeCompare(a.arrival_date),
  oldest: (a, b) => a.arrival_date.localeCompare(b.arrival_date),
  lowStock: (a, b) => a.stock_left - b.stock_left,
  highStock: (a, b) => b.stock_left - a.stock_left,
};
const SORT_LABEL: Record<SortKey, string> = {
  az: "A–Z",
  newest: "Newest Arrival",
  oldest: "Oldest Arrival",
  lowStock: "Lowest Stock",
  highStock: "Highest Stock",
};

// Shared client-side validation (mirrors server rules in /api/medicines)
function validateMedicine(v: {
  arrival_date: string;
  expiry_date: string;
  stock_arrived: string;
  stock_left: string;
}): string | null {
  const arrived = Number(v.stock_arrived);
  const left = Number(v.stock_left);
  if (!v.arrival_date || !v.expiry_date) return "Arrival and expiry dates are required.";
  if (!Number.isInteger(arrived) || arrived < 0 || !Number.isInteger(left) || left < 0)
    return "Stock values must be non-negative integers.";
  if (new Date(v.expiry_date) <= new Date(v.arrival_date))
    return "Expiry date must be after arrival date.";
  return null;
}

/* ------------------------------------------------------------------ */
/* Reusable UI primitives                                             */
/* ------------------------------------------------------------------ */

function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">✕</button>
        <Column gap="4" paddingBottom="20">
          <Heading variant="heading-strong-l">{title}</Heading>
          {subtitle && (
            <Text variant="label-default-s" onBackground="neutral-weak">{subtitle}</Text>
          )}
        </Column>
        <Line background="neutral-alpha-medium" />
        <Column gap="16" paddingY="20">{children}</Column>
        {footer}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Column gap="8" style={{ flex: 1 }}>
      <Text variant="label-default-s" onBackground="neutral-medium">{label}</Text>
      {children}
    </Column>
  );
}

function ErrorText({ message }: { message: string }) {
  if (!message) return null;
  return (
    <Text variant="body-default-s" onBackground="danger-medium" paddingBottom="12">{message}</Text>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                               */
/* ------------------------------------------------------------------ */

export default function MedicinesPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("az");
  const router = useRouter();

  const selected = medicines.find((m) => m.id === selectedId) || null;

  // Auth guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoadingAuth(false);
      } else {
        router.push("/login/hospital");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch medicines once authenticated
  useEffect(() => {
    if (loadingAuth || !user) return;
    fetch("/api/medicines")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setMedicines(data))
      .catch((err) => console.error("Error fetching medicines:", err))
      .finally(() => setLoadingData(false));
  }, [loadingAuth, user]);

  // Summary counts — recompute whenever `medicines` changes
  const stats = useMemo(
    () => ({
      total: medicines.length,
      low: medicines.filter(isLow).length,
      critical: medicines.filter(isCritical).length,
      expiring: medicines.filter(isExpiringSoon).length,
    }),
    [medicines]
  );

  // Combined search + filter + sort, applied before grouping
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return medicines
      .filter((m) => m.name.toLowerCase().includes(q))
      .filter((m) => FILTERS[filter].test(m))
      .sort(SORTS[sort]);
  }, [medicines, search, filter, sort]);

  // Optimistic state sync — all derived views (dots, badges, counts) recompute
  const handleCreated = (m: Medicine) => setMedicines((prev) => [m, ...prev]);
  const handleUpdated = (m: Medicine) =>
    setMedicines((prev) => prev.map((x) => (x.id === m.id ? m : x)));
  const handleDeleted = (id: string) =>
    setMedicines((prev) => prev.filter((x) => x.id !== id));

  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: "100vh" }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
      </Column>
    );
  }

  const summaryCards = [
    { label: "Total Medicines", value: stats.total, sub: "Distinct medicines in stock", accent: "linear-gradient(90deg, #10b981, #06b6d4)", color: "neutral-strong" as const },
    { label: "Low Stock", value: stats.low, sub: "50–75% of stock used", accent: "linear-gradient(90deg, #f59e0b, #f97316)", color: "warning-strong" as const },
    { label: "Critical Stock", value: stats.critical, sub: "Over 75% of stock used", accent: "linear-gradient(90deg, #ef4444, #dc2626)", color: "danger-strong" as const },
    { label: "Expiring Soon", value: stats.expiring, sub: "Expires within 30 days", accent: "linear-gradient(90deg, #6366f1, #8b5cf6)", color: "brand-strong" as const },
  ];

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
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16" gap="16" wrap>
          <Row gap="12" vertical="center">
            <Button
              variant="secondary"
              size="s"
              onClick={() => router.push("/dashboard/hospital")}
              prefixIcon="arrowLeft"
            >
              Back
            </Button>
            <Column gap="2">
              <Row gap="8" vertical="center">
                <Icon name="pills" size="m" onBackground="warning-medium" />
                <Heading variant="display-strong-s">Medicine Inventory</Heading>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Track stock levels, expiry and availability of essential medicines
              </Text>
            </Column>
          </Row>
          <Text variant="label-default-s" onBackground="neutral-medium">{user?.email}</Text>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Summary cards */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            width: "100%",
          }}
        >
          {summaryCards.map((c) => (
            <Column
              key={c.label}
              padding="24"
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
              gap="16"
              style={{ position: "relative", overflow: "hidden" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: c.accent }} />
              <Text variant="heading-strong-m" style={{ paddingTop: "4px" }}>{c.label}</Text>
              <Column gap="4">
                {loadingData ? (
                  <div className={styles.skeleton} style={{ height: "40px", width: "60px" }} />
                ) : (
                  <Text variant="display-strong-m" onBackground={c.color}>{c.value}</Text>
                )}
                <Text variant="body-default-s" onBackground="neutral-weak">{c.sub}</Text>
              </Column>
            </Column>
          ))}
        </div>
      </RevealFx>

      {/* Toolbar: title + add + search/filter/sort */}
      <RevealFx translateY="8" delay={0.15} fillWidth>
        <Column gap="16" fillWidth>
          <Row horizontal="between" vertical="center" fillWidth gap="12" wrap>
            <Heading variant="heading-strong-l">All Medicines</Heading>
            <Button variant="primary" size="s" onClick={() => setShowAdd(true)}>+ Add Medicine</Button>
          </Row>
          <Row gap="12" vertical="center" fillWidth wrap>
            <input
              className={styles.inputField}
              type="text"
              placeholder="🔍 Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 2, minWidth: "220px" }}
            />
            <select className={styles.inputField} value={filter} onChange={(e) => setFilter(e.target.value as FilterKey)} style={{ flex: 1, minWidth: "160px" }}>
              {(Object.keys(FILTERS) as FilterKey[]).map((k) => (
                <option key={k} value={k}>{FILTERS[k].label}</option>
              ))}
            </select>
            <select className={styles.inputField} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ flex: 1, minWidth: "160px" }}>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>Sort: {SORT_LABEL[k]}</option>
              ))}
            </select>
          </Row>
        </Column>
      </RevealFx>

      {/* Grouped medicine list */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        {loadingData ? (
          <ListSkeleton />
        ) : visible.length === 0 ? (
          <Column fillWidth padding="40" horizontal="center" background="surface" border="neutral-alpha-weak" radius="l">
            <Text variant="body-default-m" onBackground="neutral-weak">
              {medicines.length === 0 ? "No medicines found." : "No medicines match your search/filter."}
            </Text>
          </Column>
        ) : (
          <Column gap="32" fillWidth>
            {CATEGORY_ORDER.filter((cat) => visible.some((m) => m.category === cat)).map((cat) => (
              <Column key={cat} gap="16" fillWidth>
                <Row gap="12" vertical="center">
                  <Heading variant="heading-strong-l">{CATEGORY_LABEL[cat]}</Heading>
                  <Badge background="neutral-alpha-medium" textVariant="label-strong-s">
                    {visible.filter((m) => m.category === cat).length}
                  </Badge>
                </Row>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  {visible
                    .filter((m) => m.category === cat)
                    .map((m) => (
                      <MedicineCard key={m.id} medicine={m} onClick={() => setSelectedId(m.id)} />
                    ))}
                </div>
              </Column>
            ))}
          </Column>
        )}
      </RevealFx>

      {selected && (
        <MedicineDetailPanel
          medicine={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}

      {showAdd && <AddMedicinePanel onClose={() => setShowAdd(false)} onCreated={handleCreated} />}
    </Column>
  );
}

/* ------------------------------------------------------------------ */
/* Cards & skeletons                                                  */
/* ------------------------------------------------------------------ */

function MedicineCard({ medicine, onClick }: { medicine: Medicine; onClick: () => void }) {
  const dot = stockDotColor(medicine);
  const expired = isExpired(medicine);
  const expiringSoon = !expired && isExpiringSoon(medicine);

  return (
    <Column
      className={styles.card}
      padding="20"
      background="surface"
      border="neutral-alpha-weak"
      radius="l"
      gap="12"
      onClick={onClick}
      style={{ cursor: "pointer" }}
    >
      <Row horizontal="between" vertical="center" gap="12">
        <Column gap="4" style={{ minWidth: 0 }}>
          <Text variant="heading-strong-s" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {medicine.name}
          </Text>
          <Text variant="label-default-s" onBackground="neutral-weak" style={{ textTransform: "capitalize" }}>
            {medicine.category}
          </Text>
        </Column>
        <div className={`${styles.dot} ${styles[dot]}`} title={`${Math.round(usedRatio(medicine) * 100)}% used`} />
      </Row>

      <Line background="neutral-alpha-weak" />

      <Row horizontal="between" vertical="center" gap="8">
        <Text variant="body-default-s" onBackground="neutral-medium">
          {medicine.stock_left} / {medicine.stock_arrived} left
        </Text>
        {expired ? (
          <Badge background="danger-medium" textVariant="label-strong-s">❌ Expired</Badge>
        ) : expiringSoon ? (
          <Badge background="warning-medium" textVariant="label-strong-s">⚠️ Expiring Soon</Badge>
        ) : null}
      </Row>
    </Column>
  );
}

function ListSkeleton() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", width: "100%" }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Column key={i} padding="20" background="surface" border="neutral-alpha-weak" radius="l" gap="12">
          <div className={styles.skeleton} style={{ height: "18px", width: "70%" }} />
          <div className={styles.skeleton} style={{ height: "12px", width: "40%" }} />
          <Line background="neutral-alpha-weak" />
          <div className={styles.skeleton} style={{ height: "14px", width: "50%" }} />
        </Column>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add / Edit / Delete modals                                         */
/* ------------------------------------------------------------------ */

function AddMedicinePanel({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (m: Medicine) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "tablet" as Medicine["category"],
    arrival_date: "",
    stock_arrived: "",
    stock_left: "",
    expiry_date: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v as any }));

  const handleSave = async () => {
    if (!form.name.trim()) return setError("Medicine name is required.");
    const invalid = validateMedicine(form);
    if (invalid) return setError(invalid);

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          category: form.category,
          arrival_date: form.arrival_date,
          stock_arrived: Number(form.stock_arrived),
          stock_left: Number(form.stock_left),
          expiry_date: form.expiry_date,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to add medicine.");
      onCreated(body);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add medicine.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Add Medicine"
      subtitle="Register a new medicine into inventory"
      onClose={onClose}
      footer={
        <>
          <ErrorText message={error} />
          <Row gap="12" horizontal="end">
            <Button variant="secondary" size="s" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" size="s" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </Row>
        </>
      }
    >
      <Field label="Medicine Name">
        <input className={styles.inputField} type="text" value={form.name} placeholder="e.g. Paracetamol 500mg"
          onChange={(e) => set("name", e.target.value)} disabled={saving} />
      </Field>
      <Field label="Category">
        <select className={styles.inputField} value={form.category} onChange={(e) => set("category", e.target.value)} disabled={saving}>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
        </select>
      </Field>
      <Row gap="12">
        <Field label="Arrival Date">
          <input className={styles.inputField} type="date" value={form.arrival_date}
            onChange={(e) => set("arrival_date", e.target.value)} disabled={saving} />
        </Field>
        <Field label="Expiry Date">
          <input className={styles.inputField} type="date" value={form.expiry_date}
            onChange={(e) => set("expiry_date", e.target.value)} disabled={saving} />
        </Field>
      </Row>
      <Row gap="12">
        <Field label="Stock Arrived">
          <input className={styles.inputField} type="number" min="0" step="1" value={form.stock_arrived}
            onChange={(e) => set("stock_arrived", e.target.value)} disabled={saving} />
        </Field>
        <Field label="Current Stock">
          <input className={styles.inputField} type="number" min="0" step="1" value={form.stock_left}
            onChange={(e) => set("stock_left", e.target.value)} disabled={saving} />
        </Field>
      </Row>
    </Modal>
  );
}

function MedicineDetailPanel({
  medicine,
  onClose,
  onUpdated,
  onDeleted,
}: {
  medicine: Medicine;
  onClose: () => void;
  onUpdated: (m: Medicine) => void;
  onDeleted: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    arrival_date: medicine.arrival_date,
    stock_arrived: String(medicine.stock_arrived),
    stock_left: String(medicine.stock_left),
    expiry_date: medicine.expiry_date,
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = () => {
    setForm({
      arrival_date: medicine.arrival_date,
      stock_arrived: String(medicine.stock_arrived),
      stock_left: String(medicine.stock_left),
      expiry_date: medicine.expiry_date,
    });
    setError("");
    setEditing(true);
  };

  const handleSave = async () => {
    const invalid = validateMedicine(form);
    if (invalid) return setError(invalid);

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/medicines/${medicine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          arrival_date: form.arrival_date,
          stock_arrived: Number(form.stock_arrived),
          stock_left: Number(form.stock_left),
          expiry_date: form.expiry_date,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to update medicine.");
      onUpdated(body);
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/medicines/${medicine.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete medicine.");
      }
      onDeleted(medicine.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete medicine.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  // Read-only value / edit input per field
  const fields: { label: string; view: ReactNode; edit: ReactNode }[] = [
    { label: "Date of Arrival", view: medicine.arrival_date, edit: (
      <input className={styles.inputField} type="date" value={form.arrival_date}
        onChange={(e) => set("arrival_date", e.target.value)} disabled={saving} />) },
    { label: "Total Stock Arrived", view: medicine.stock_arrived, edit: (
      <input className={styles.inputField} type="number" min="0" step="1" value={form.stock_arrived}
        onChange={(e) => set("stock_arrived", e.target.value)} disabled={saving} />) },
    { label: "Stock Left", view: medicine.stock_left, edit: (
      <input className={styles.inputField} type="number" min="0" step="1" value={form.stock_left}
        onChange={(e) => set("stock_left", e.target.value)} disabled={saving} />) },
    { label: "Expiry Date", view: medicine.expiry_date, edit: (
      <input className={styles.inputField} type="date" value={form.expiry_date}
        onChange={(e) => set("expiry_date", e.target.value)} disabled={saving} />) },
  ];

  const footer = confirmDelete ? (
    <Column gap="12">
      <ErrorText message={error} />
      <Text variant="body-default-m" onBackground="neutral-strong">
        Are you sure you want to remove this medicine?
      </Text>
      <Row gap="12" horizontal="end">
        <Button variant="secondary" size="s" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</Button>
        <Button variant="danger" size="s" onClick={handleDelete} disabled={deleting}>
          {deleting ? "Removing..." : "Remove"}
        </Button>
      </Row>
    </Column>
  ) : (
    <>
      <ErrorText message={error} />
      <Row gap="12" horizontal="between" vertical="center">
        {!editing ? (
          <Button variant="danger" size="s" onClick={() => { setConfirmDelete(true); setError(""); }}>Delete</Button>
        ) : <span />}
        <Row gap="12">
          {editing ? (
            <>
              <Button variant="secondary" size="s" onClick={() => { setEditing(false); setError(""); }} disabled={saving}>Cancel</Button>
              <Button variant="primary" size="s" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="s" onClick={startEdit}>Edit</Button>
          )}
        </Row>
      </Row>
    </>
  );

  return (
    <Modal title={medicine.name} subtitle={CATEGORY_LABEL[medicine.category]} onClose={onClose} footer={footer}>
      {fields.map((f) => (
        <Field key={f.label} label={f.label}>
          {editing ? f.edit : <Text variant="body-strong-m">{f.view}</Text>}
        </Field>
      ))}
    </Modal>
  );
}
