"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
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
// Room & Bed component imports removed

// ── Types ───────────────────────────────────────────────────────────────────
type JoinStatus = "not_submitted" | "pending" | "approved" | "rejected" | "loading";

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

const PRIORITIES = ["Low", "Medium", "High", "Emergency"] as const;

// ── Status Badge Color Helper ───────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// ── Main Component ──────────────────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
export default function HospitalDashboard() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("loading");
  // Room capacity state removed
  const [querySubject, setQuerySubject] = useState("");
  const [queryText, setQueryText] = useState("");
  const [queryPriority, setQueryPriority] = useState<string>("Medium");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [dbQueries, setDbQueries] = useState<DbQuery[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const router = useRouter();
  const { addToast } = useToast();

  // ── Auth ────────────────────────────────────────────────────────────────
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

  // ── Join status ─────────────────────────────────────────────────────────
  const checkJoinStatus = useCallback(async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from("access_requests")
        .select("status")
        .eq("contact_email", user.email)
        .order("submitted_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error checking join status:", error);
        setJoinStatus("not_submitted");
        return;
      }
      if (data && data.length > 0) {
        setJoinStatus(data[0].status as JoinStatus);
      } else {
        setJoinStatus("not_submitted");
      }
    } catch {
      setJoinStatus("not_submitted");
    }
  }, [user?.email]);

  useEffect(() => {
    if (!loadingAuth && user) checkJoinStatus();
  }, [loadingAuth, user, checkJoinStatus]);

  // Room capacity load hook removed

  // ── Load this hospital's queries from DB ─────────────────────────────────
  const loadDbQueries = useCallback(async (uid: string) => {
    setLoadingQueries(true);
    try {
      const res = await fetch(`/api/queries?hospitalId=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setDbQueries(json.data as DbQuery[]);
    } catch (err) {
      console.error("Failed to load queries:", err);
    } finally {
      setLoadingQueries(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth && user) loadDbQueries(user.uid);
  }, [loadingAuth, user, loadDbQueries]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login/hospital");
  };

  // ── Send Query handler ─────────────────────────────────────────────────
  const handleSendQuery = async () => {
    if (!querySubject.trim()) {
      addToast({ variant: "danger", message: "Please enter a subject." });
      return;
    }
    if (!queryText.trim()) {
      addToast({ variant: "danger", message: "Please describe your query." });
      return;
    }
    if (!user) return;

    setSubmittingQuery(true);
    try {
      const res = await fetch("/api/queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospitalId: user.uid,
          hospitalName: user.displayName || user.email || user.uid,
          subject: querySubject.trim(),
          message: queryText.trim(),
          priority: queryPriority,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit.");

      setDbQueries((prev) => [json.data as DbQuery, ...prev]);
      setQuerySubject("");
      setQueryText("");
      setQueryPriority("Medium");
      addToast({ variant: "success", message: "Query sent successfully to District Administration." });
    } catch (err: any) {
      addToast({ variant: "danger", message: err.message || "Could not send query." });
    } finally {
      setSubmittingQuery(false);
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: "100vh" }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
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
      {/* ── Keyframe animations (injected once) ──────────────────────────── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Dashboard Header — UNCHANGED                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Column gap="8">
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
                🏥
              </div>
              <Column gap="2">
                <Heading variant="display-strong-s">Facility Dashboard</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  PHC/CHC Operations &amp; Management
                </Text>
              </Column>
            </Row>
          </Column>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              Sign Out
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* District Dashboard Connection — UNCHANGED                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Row
          fillWidth
          padding="24"
          radius="l"
          vertical="center"
          horizontal="between"
          style={{
            background:
              joinStatus === "approved"
                ? "var(--success-alpha-weak)"
                : joinStatus === "pending"
                ? "var(--warning-alpha-weak)"
                : joinStatus === "rejected"
                ? "var(--danger-alpha-weak)"
                : "var(--brand-alpha-weak)",
            border:
              joinStatus === "approved"
                ? "1px solid var(--success-alpha-medium)"
                : joinStatus === "pending"
                ? "1px solid var(--warning-alpha-medium)"
                : joinStatus === "rejected"
                ? "1px solid var(--danger-alpha-medium)"
                : "1px solid var(--brand-alpha-medium)",
            borderRadius: "16px",
          }}
        >
          <Column gap="8" style={{ flex: 1 }}>
            <Row gap="12" vertical="center">
              <Heading variant="heading-strong-m">District Dashboard Connection</Heading>
              {joinStatus === "loading" ? (
                <Badge background="neutral-alpha-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  CHECKING...
                </Badge>
              ) : joinStatus === "approved" ? (
                <Badge background="success-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  ✓ CONNECTED
                </Badge>
              ) : joinStatus === "pending" ? (
                <Badge background="warning-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  ⏳ PENDING REVIEW
                </Badge>
              ) : joinStatus === "rejected" ? (
                <Badge background="danger-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  ✕ REJECTED
                </Badge>
              ) : (
                <Badge background="brand-alpha-medium" textVariant="label-strong-s" paddingX="12" paddingY="4">
                  NOT CONNECTED
                </Badge>
              )}
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak" style={{ maxWidth: "600px" }}>
              {joinStatus === "approved"
                ? "Your facility is connected to the district dashboard. Your data reports are visible to the district administrator."
                : joinStatus === "pending"
                ? "Your join request has been submitted and is awaiting review by the district administrator."
                : joinStatus === "rejected"
                ? "Your previous request was rejected. Please contact the district health office or resubmit with updated documents."
                : "Connect your facility to the district dashboard to share reports and receive AI-driven recommendations."}
            </Text>
          </Column>
          {(joinStatus === "not_submitted" || joinStatus === "rejected") && (
            <Button
              id="join-district-btn"
              variant="primary"
              size="m"
              weight="strong"
              href="/login/hospital"
              onClick={() => {}}
            >
              Request to Join
            </Button>
          )}
          {joinStatus === "pending" && (
            <Button variant="secondary" size="s" onClick={checkJoinStatus}>
              ↻ Check Status
            </Button>
          )}
        </Row>
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Send Query to District Administration                             */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="12" delay={0.15} fillWidth>
        <Column
          fillWidth
          padding="32"
          gap="20"
          style={{
            background: "var(--surface-background)",
            border: "1px solid var(--neutral-border-medium)",
            borderRadius: "20px",
            position: "relative",
            overflow: "hidden",
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
              background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
            }}
          />

          <Row gap="12" vertical="center" paddingTop="4">
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
              }}
            >
              📨
            </div>
            <Column gap="2">
              <Heading variant="heading-strong-l">Need Assistance?</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                Send your queries, requests, complaints, or resource requirements directly to the District Administration.
              </Text>
            </Column>
          </Row>

          <textarea
            value={querySubject}
            onChange={(e) => setQuerySubject(e.target.value)}
            placeholder="Query subject (e.g. Oxygen Cylinder Request)"
            rows={1}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "14px",
              border: "1px solid var(--neutral-border-medium)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--neutral-on-background-strong)",
              fontSize: "15px",
              fontFamily: "inherit",
              resize: "none",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--neutral-border-medium)")}
          />

          {/* Priority selector */}
          <Row gap="8" vertical="center">
            <Text variant="label-strong-s" onBackground="neutral-weak" style={{ minWidth: 80 }}>Priority:</Text>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  onClick={() => setQueryPriority(p)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    border: queryPriority === p ? "2px solid #6366f1" : "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: queryPriority === p ? 700 : 400,
                    transition: "all 0.15s",
                    ...priorityBadgeStyle(p),
                    opacity: queryPriority === p ? 1 : 0.55,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </Row>

          <textarea
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder={`Describe your query in detail...\nExample: "We require 20 additional oxygen cylinders urgently."`}
            rows={4}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "14px",
              border: "1px solid var(--neutral-border-medium)",
              background: "rgba(255,255,255,0.03)",
              color: "var(--neutral-on-background-strong)",
              fontSize: "15px",
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#6366f1")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--neutral-border-medium)")}
          />

          <Row gap="12">
            <Button
              variant="primary"
              size="m"
              weight="strong"
              onClick={handleSendQuery}
              // disabled prop type might not support boolean directly
            >
              {submittingQuery ? "Sending…" : "Send Query"}
            </Button>
            <Button
              variant="secondary"
              size="m"
              onClick={() => { setQuerySubject(""); setQueryText(""); setQueryPriority("Medium"); }}
            >
              Clear
            </Button>
          </Row>
        </Column>
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* My Submitted Queries                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <Column
          fillWidth
          padding="32"
          gap="20"
          style={{
            background: "var(--surface-background)",
            border: "1px solid var(--neutral-border-medium)",
            borderRadius: "20px",
          }}
        >
          <Heading variant="heading-strong-l">My Submitted Queries</Heading>

          {loadingQueries ? (
            <Text variant="body-default-m" onBackground="neutral-weak">Loading queries…</Text>
          ) : dbQueries.length === 0 ? (
            <Text variant="body-default-m" onBackground="neutral-weak">
              No queries submitted yet. Use the form above to send your first query.
            </Text>
          ) : (
            <>
              {/* Table header */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr",
                  gap: "8px",
                  padding: "10px 16px",
                  borderRadius: "12px",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {["Subject", "Priority", "Status", "District Reply", "Date"].map((h) => (
                  <Text key={h} variant="label-strong-s" onBackground="neutral-weak">{h}</Text>
                ))}
              </div>

              {/* Rows */}
              <Column gap="8">
                {dbQueries.map((q) => (
                  <div
                    key={q.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 2fr 1fr",
                      gap: "8px",
                      alignItems: "center",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <Text variant="body-default-s" onBackground="neutral-strong">{q.subject}</Text>
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
                    <Text variant="body-default-s" onBackground="neutral-medium">
                      {q.reply ?? <span style={{ opacity: 0.4 }}>Awaiting reply…</span>}
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {new Date(q.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </Text>
                  </div>
                ))}
              </Column>
            </>
          )}
        </Column>
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Bed / Room Availability                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="12" delay={0.25} fillWidth>
        <Column
          fillWidth
          padding="32"
          gap="20"
          style={{
            background: "var(--surface-background)",
            border: "1px solid var(--neutral-border-medium)",
            borderRadius: "20px",
            position: "relative",
            overflow: "hidden",
            cursor: "pointer",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)";
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "none";
          }}
          onClick={() => router.push("/dashboard/rooms")}
        >
          {/* accent top bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "3px",
              background: "linear-gradient(90deg, #10b981, #06b6d4)",
            }}
          />

          <Row gap="16" vertical="center" paddingTop="4" horizontal="between" fillWidth>
            <Row gap="16" vertical="center">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                🛏️
              </div>
              <Column gap="4">
                <Heading variant="heading-strong-l">Bed / Room Availability</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Monitor live ward counts, patient occupancy percentages, and bed assignments.
                </Text>
              </Column>
            </Row>
            <Button variant="secondary" size="m">
              View Rooms &amp; Beds →
            </Button>
          </Row>
        </Column>
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Quick Actions — UNCHANGED                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="16" delay={0.3} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="24">
          <Heading variant="heading-strong-l">Quick Actions</Heading>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              width: "100%",
            }}
          >
            <Button variant="secondary" size="m" fillWidth>
              📋 Submit Daily Report
            </Button>
            <Button variant="secondary" size="m" fillWidth>
              💊 Request Stock Transfer
            </Button>
            <Button variant="secondary" size="m" fillWidth>
              🔬 Log Test Results
            </Button>
            <Button variant="secondary" size="m" fillWidth>
              📞 Contact District HQ
            </Button>
          </div>
        </Column>
      </RevealFx>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* Recent Activity — UNCHANGED                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <RevealFx translateY="20" delay={0.4} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="20">
          <Row horizontal="between" vertical="center">
            <Heading variant="heading-strong-l">Recent Activity</Heading>
            <Text variant="label-default-s" onBackground="neutral-medium">Last 24 hours</Text>
          </Row>

          <Column gap="12">
            {[
              { time: "09:15 AM", event: "Stock update: Paracetamol inventory updated (500 → 420 units)", type: "stock" },
              { time: "08:30 AM", event: "Dr. Priya Sharma marked present for morning shift", type: "staff" },
              { time: "08:00 AM", event: "Daily report auto-submitted to district dashboard", type: "report" },
              { time: "Yesterday", event: "Bed #14 discharged — Patient: Ravi Kumar (OPD-2847)", type: "bed" },
              { time: "Yesterday", event: "Blood test results uploaded for 12 patients", type: "test" },
            ].map((item, index) => (
              <Row
                key={index}
                fillWidth
                padding="16"
                background="neutral-alpha-weak"
                radius="m"
                gap="16"
                vertical="center"
                style={{ borderRadius: "12px" }}
              >
                <Text
                  variant="label-strong-s"
                  onBackground="neutral-medium"
                  style={{ minWidth: "80px", flexShrink: 0 }}
                >
                  {item.time}
                </Text>
                <Text variant="body-default-s" onBackground="neutral-strong">
                  {item.event}
                </Text>
              </Row>
            ))}
          </Column>
        </Column>
      </RevealFx>

      {/* Room Detail Modal removed from dashboard */}
    </Column>
  );
}
