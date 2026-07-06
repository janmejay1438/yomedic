"use client";

import { useEffect, useState, useCallback } from "react";
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
  useToast,
} from "@once-ui-system/core";

// ── Types ──────────────────────────────────────────────────────────────────────
interface DbQuery {
  id: string;
  hospitalId: string;
  hospitalName: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  reply: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function statusBadgeStyle(status: string) {
  switch (status) {
    case "Pending":     return { background: "#f59e0b", color: "#000" };
    case "In Progress": return { background: "#3b82f6", color: "#fff" };
    case "Resolved":    return { background: "#10b981", color: "#fff" };
    default:            return { background: "rgba(255,255,255,0.1)", color: "#fff" };
  }
}

function priorityBadgeStyle(priority: string) {
  switch (priority) {
    case "Emergency": return { background: "#ef4444", color: "#fff" };
    case "High":      return { background: "#f97316", color: "#fff" };
    case "Medium":    return { background: "#f59e0b", color: "#000" };
    default:          return { background: "#6b7280", color: "#fff" };
  }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ── Reply Modal ────────────────────────────────────────────────────────────────
function ReplyModal({
  query,
  onClose,
  onSaved,
}: {
  query: DbQuery;
  onClose: () => void;
  onSaved: (updated: DbQuery) => void;
}) {
  const [replyText, setReplyText] = useState(query.reply ?? "");
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!replyText.trim()) {
      addToast({ variant: "danger", message: "Reply cannot be empty." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/queries/${query.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save reply.");
      addToast({ variant: "success", message: "Reply sent successfully." });
      onSaved(json.data as DbQuery);
      onClose();
    } catch (err: any) {
      addToast({ variant: "danger", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        padding: "16px",
      }}
    >
      <Column
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        padding="32" gap="20"
        style={{
          background: "var(--surface-background)",
          border: "1px solid var(--neutral-border-medium)",
          borderRadius: "20px",
          width: "min(560px, 96vw)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        <Heading variant="heading-strong-l">Reply to Query</Heading>
        <Column gap="4">
          <Text variant="label-strong-s" onBackground="neutral-weak">Hospital</Text>
          <Text variant="body-default-m">{query.hospitalName}</Text>
        </Column>
        <Column gap="4">
          <Text variant="label-strong-s" onBackground="neutral-weak">Subject</Text>
          <Text variant="body-default-m">{query.subject}</Text>
        </Column>
        <Column gap="4">
          <Text variant="label-strong-s" onBackground="neutral-weak">Message</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">{query.message}</Text>
        </Column>
        <Column gap="8">
          <Text variant="label-strong-s" onBackground="neutral-weak">Your Reply</Text>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={4}
            placeholder="Write your official reply here…"
            style={{
              width: "100%", padding: "14px 16px",
              borderRadius: "12px", border: "1px solid var(--neutral-border-medium)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--neutral-on-background-strong)",
              fontSize: "15px", fontFamily: "inherit",
              resize: "vertical", outline: "none",
            }}
          />
        </Column>
        <Row gap="12">
          <Button variant="primary" size="m" weight="strong" onClick={handleSave}>
            {saving ? "Sending…" : "Send Reply"}
          </Button>
          <Button variant="secondary" size="m" onClick={onClose}>Cancel</Button>
        </Row>
      </Column>
    </div>
  );
}

// ── View Modal ─────────────────────────────────────────────────────────────────
function ViewModal({ query, onClose }: { query: DbQuery; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)",
        padding: "16px",
      }}
    >
      <Column
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        padding="32" gap="20"
        style={{
          background: "var(--surface-background)",
          border: "1px solid var(--neutral-border-medium)",
          borderRadius: "20px",
          width: "min(560px, 96vw)",
          maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
        }}
      >
        <Row horizontal="between" vertical="center">
          <Heading variant="heading-strong-l">Query Details</Heading>
          <div onClick={onClose} style={{ cursor: "pointer", fontSize: "22px", opacity: 0.6, padding: "4px 8px" }}>✕</div>
        </Row>
        <Line background="neutral-alpha-weak" />
        {[
          { label: "Hospital", value: query.hospitalName },
          { label: "Subject", value: query.subject },
          { label: "Message", value: query.message },
          { label: "Priority", value: query.priority },
          { label: "Status", value: query.status },
          { label: "Submitted", value: fmt(query.createdAt) },
        ].map(({ label, value }) => (
          <Column key={label} gap="4">
            <Text variant="label-strong-s" onBackground="neutral-weak">{label}</Text>
            <Text variant="body-default-m">{value}</Text>
          </Column>
        ))}
        {query.reply && (
          <Column gap="4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "16px" }}>
            <Text variant="label-strong-s" onBackground="brand-medium">District Reply</Text>
            <Text variant="body-default-m">{query.reply}</Text>
          </Column>
        )}
        <Button variant="secondary" size="m" fillWidth onClick={onClose}>Close</Button>
      </Column>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Component ────────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [queries, setQueries] = useState<DbQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [viewQuery, setViewQuery] = useState<DbQuery | null>(null);
  const [replyQuery, setReplyQuery] = useState<DbQuery | null>(null);
  const router = useRouter();
  const { addToast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoadingAuth(false);
      } else {
        router.push("/login");
      }
    });
    return () => unsubscribe();
  }, [router]);

  // ── Load all hospital queries ──────────────────────────────────────────────
  const loadQueries = useCallback(async () => {
    setLoadingQueries(true);
    try {
      const res = await fetch("/api/queries", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) setQueries(json.data as DbQuery[]);
    } catch (err) {
      console.error("Failed to load queries:", err);
    } finally {
      setLoadingQueries(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth && user) loadQueries();
  }, [loadingAuth, user, loadQueries]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  // ── Resolve ────────────────────────────────────────────────────────────────
  const handleResolve = async (q: DbQuery) => {
    try {
      const res = await fetch(`/api/queries/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Resolved" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to resolve.");
      setQueries((prev) => prev.map((x) => (x.id === q.id ? (json.data as DbQuery) : x)));
      addToast({ variant: "success", message: "Query marked as Resolved." });
    } catch (err: any) {
      addToast({ variant: "danger", message: err.message });
    }
  };

  const handleReplySaved = (updated: DbQuery) => {
    setQueries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  };

  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: "100vh" }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
      </Column>
    );
  }

  const pendingCount = queries.filter((q) => q.status === "Pending").length;

  return (
    <Column fillWidth paddingX="l" paddingY="xl" gap="32" style={{ maxWidth: "1200px", margin: "0 auto", minHeight: "100vh" }}>

      {/* Dashboard Header */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Column gap="8">
            <Heading variant="display-strong-s">District Command Center</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Real-time monitoring across all PHCs &amp; CHCs
            </Text>
          </Column>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Logged in as: {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              Sign Out
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Critical Alerts Banner */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Row
          fillWidth padding="16"
          background="danger-alpha-weak" border="danger-alpha-medium"
          radius="m" vertical="center" horizontal="between"
        >
          <Row gap="12" vertical="center">
            <Badge background="danger-medium" textVariant="label-strong-s">CRITICAL ALERT</Badge>
            <Text variant="body-strong-m" onBackground="danger-strong">
              High risk of Paracetamol stock-out at CHC North within 24 hours.
            </Text>
          </Row>
          <Button variant="primary" size="s" weight="strong">Redistribute Stock</Button>
        </Row>
      </RevealFx>

      {/* Metrics Grid */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", width: "100%" }}>

          {/* Stock Monitoring */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Stock Levels</Text>
              <Badge background="warning-medium" textVariant="label-strong-s">ATTENTION</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="warning-strong">68%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Average essential medicine availability</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>View AI Forecasts →</Text>
          </Column>

          {/* Patient Footfall */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Patient Footfall</Text>
              <Badge background="success-medium" textVariant="label-strong-s">LIVE</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="success-strong">1,248</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Total patients processed today</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>View Trend Analysis →</Text>
          </Column>

          {/* Bed Availability */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Bed Capacity</Text>
              <Badge background="danger-medium" textVariant="label-strong-s">CRITICAL</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="danger-strong">12 / 150</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Available beds across district</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>Manage Transfers →</Text>
          </Column>

          {/* Doctor Attendance */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Staffing</Text>
              <Badge background="brand-medium" textVariant="label-strong-s">STABLE</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="brand-strong">85%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Doctor &amp; specialist attendance</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>View Roster →</Text>
          </Column>

        </div>
      </RevealFx>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Hospital Queries Panel                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="12" delay={0.25} fillWidth>
        <Column
          fillWidth padding="32" gap="20"
          style={{
            background: "var(--surface-background)",
            border: "1px solid var(--neutral-border-medium)",
            borderRadius: "20px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* accent bar */}
          <div
            style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "3px",
              background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
            }}
          />

          <Row horizontal="between" vertical="center" fillWidth paddingTop="4">
            <Row gap="12" vertical="center">
              <div
                style={{
                  width: "42px", height: "42px", borderRadius: "12px",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px",
                }}
              >
                📬
              </div>
              <Column gap="2">
                <Heading variant="heading-strong-l">Hospital Queries</Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Queries submitted by connected hospitals — review, reply and resolve.
                </Text>
              </Column>
            </Row>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              {pendingCount > 0 && (
                <span
                  style={{
                    background: "#f59e0b", color: "#000",
                    borderRadius: "20px", padding: "4px 12px",
                    fontSize: "12px", fontWeight: 700,
                  }}
                >
                  {pendingCount} Pending
                </span>
              )}
              <Button variant="secondary" size="s" onClick={loadQueries}>↻ Refresh</Button>
            </div>
          </Row>

          {loadingQueries ? (
            <Text variant="body-default-m" onBackground="neutral-weak">Loading queries…</Text>
          ) : queries.length === 0 ? (
            <Text variant="body-default-m" onBackground="neutral-weak">
              No queries submitted by hospitals yet.
            </Text>
          ) : (
            <>
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.8fr 1.6fr 1fr 1fr 1fr 1fr",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {["Hospital", "Subject", "Priority", "Status", "Date", "Actions"].map((h) => (
                  <Text key={h} variant="label-strong-s" onBackground="neutral-weak">{h}</Text>
                ))}
              </div>

              {/* Rows */}
              <Column gap="8">
                {queries.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.8fr 1.6fr 1fr 1fr 1fr 1fr",
                      gap: "8px",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <Text variant="body-default-s" onBackground="neutral-strong">
                      {q.hospitalName}
                    </Text>
                    <Text variant="body-default-s" onBackground="neutral-medium">
                      {q.subject}
                    </Text>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        ...priorityBadgeStyle(q.priority),
                      }}
                    >
                      {q.priority}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 10px",
                        borderRadius: "20px",
                        fontSize: "11px",
                        fontWeight: 700,
                        ...statusBadgeStyle(q.status),
                      }}
                    >
                      {q.status}
                    </span>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {fmt(q.createdAt)}
                    </Text>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <Button variant="secondary" size="s" onClick={() => setViewQuery(q)}>View</Button>
                      {q.status !== "Resolved" && (
                        <>
                          <Button variant="secondary" size="s" onClick={() => setReplyQuery(q)}>Reply</Button>
                          <Button variant="primary" size="s" onClick={() => handleResolve(q)}>Resolve</Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </Column>
            </>
          )}
        </Column>
      </RevealFx>

      {/* AI Recommendations Section */}
      <RevealFx translateY="16" delay={0.3} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="24">
          <Heading variant="heading-strong-l">AI Redistribution Recommendations</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Based on current test availability audits and predicted demand, the following re-allocations are suggested:
          </Text>
          <Column gap="16">
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">Transfer 500x Dengue Rapid Test Kits</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">From: PHC East (Surplus) → To: CHC South (High Predicted Demand)</Text>
              </Column>
              <Button variant="primary" size="s">Approve Transfer</Button>
            </Row>
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">Re-route 3 Incoming Ambulances</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">From: CHC Central (0 beds) → To: CHC West (15 beds)</Text>
              </Column>
              <Button variant="primary" size="s">Execute Reroute</Button>
            </Row>
          </Column>
        </Column>
      </RevealFx>

      {/* Modals */}
      {viewQuery && <ViewModal query={viewQuery} onClose={() => setViewQuery(null)} />}
      {replyQuery && (
        <ReplyModal
          query={replyQuery}
          onClose={() => setReplyQuery(null)}
          onSaved={handleReplySaved}
        />
      )}
    </Column>
  );
}
