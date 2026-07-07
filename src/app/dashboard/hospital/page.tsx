"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import { useTranslations } from "next-intl";
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

type JoinStatus = "not_submitted" | "pending" | "approved" | "rejected" | "loading";

export default function HospitalDashboard() {
  const t = useTranslations("Dashboard");
  const tHeader = useTranslations("Header");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [joinStatus, setJoinStatus] = useState<JoinStatus>("loading");
  const [totalBloodUnits, setTotalBloodUnits] = useState<number | null>(null);
  const [todayPatientsCount, setTodayPatientsCount] = useState<number | null>(null);
  const [staffPresent, setStaffPresent] = useState<number | null>(null);
  const [staffTotal, setStaffTotal] = useState<number | null>(null);
  const [medicineAvailability, setMedicineAvailability] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/blood-inventory")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const total = data.reduce((acc, curr) => acc + (curr.quantity_units || 0), 0);
          setTotalBloodUnits(total);
        }
      })
      .catch((err) => console.error("Error fetching blood inventory:", err));
  }, []);

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

  // Check if this user's facility has an existing join request
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

  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      const patRes = await fetch("/api/patients");
      if (patRes.ok) {
        const patData = await patRes.json();
        if (Array.isArray(patData)) {
          const todayPats = patData.filter((p: any) => p.registration_date === todayStr);
          setTodayPatientsCount(todayPats.length);
        }
      }

      const staffRes = await fetch("/api/staff-members");
      if (staffRes.ok) {
        const staffData = await staffRes.json();
        if (Array.isArray(staffData)) {
          setStaffTotal(staffData.length);

          let presentCount = 0;
          await Promise.all(
            staffData.map(async (m: any) => {
              try {
                const attRes = await fetch(`/api/staff-members/${m.id}/attendance`);
                if (attRes.ok) {
                  const list = await attRes.json();
                  if (Array.isArray(list)) {
                    const todayRecord = list.find((r: any) => r.date === todayStr);
                    if (todayRecord && todayRecord.status === "Present") {
                      presentCount++;
                    }
                  }
                }
              } catch (err) {
                console.error("Error fetching attendance", err);
              }
            })
          );
          setStaffPresent(presentCount);
        }
      }

      const medRes = await fetch("/api/medicines");
      if (medRes.ok) {
        const medData = await medRes.json();
        if (Array.isArray(medData)) {
          if (medData.length === 0) {
            setMedicineAvailability(100);
          } else {
            const greenCount = medData.filter((m: any) => {
              const arrived = Number(m.stock_arrived) || 0;
              const left = Number(m.stock_left) || 0;
              const usedRatio = arrived > 0 ? (arrived - left) / arrived : 0;
              return usedRatio < 0.5;
            }).length;
            const pct = Math.round((greenCount / medData.length) * 100);
            setMedicineAvailability(pct);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching metrics:", err);
    }
  }, []);

  useEffect(() => {
    if (!loadingAuth && user) {
      checkJoinStatus();
      fetchDashboardMetrics();

      // Refetch when tab gains focus
      window.addEventListener("focus", fetchDashboardMetrics);
      return () => {
        window.removeEventListener("focus", fetchDashboardMetrics);
      };
    }
  }, [loadingAuth, user, checkJoinStatus, fetchDashboardMetrics]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login/hospital");
  };

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
      {/* Dashboard Header */}
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
                <Heading variant="display-strong-s">{t("title")}</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  {t("subtitle")}
                </Text>
              </Column>
            </Row>
          </Column>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              {tHeader("signOut")}
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Join District Dashboard Section */}
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
              onClick={() => {
                // Navigate to hospital login which has the RequestAccessModal
                // In a real app this would open the modal directly
              }}
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

      {/* Quick Stats Grid */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "20px",
            width: "100%",
          }}
        >
          {/* Stock Levels */}
          <Column
            padding="24"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="16"
            style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
            onClick={() => router.push("/dashboard/hospital/medicines")}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #f59e0b, #f97316)",
              }}
            />
            <Row horizontal="between" vertical="center" paddingTop="4">
              <Text variant="heading-strong-m">{t("stockLevels")}</Text>
              {(() => {
                if (medicineAvailability === null) {
                  return <Badge background="neutral-alpha-medium" textVariant="label-strong-s">{t("loading")}</Badge>;
                }
                if (medicineAvailability >= 70) {
                  return <Badge background="success-medium" textVariant="label-strong-s">{t("healthy")}</Badge>;
                }
                if (medicineAvailability >= 40) {
                  return <Badge background="warning-medium" textVariant="label-strong-s">{t("low")}</Badge>;
                }
                return <Badge background="danger-medium" textVariant="label-strong-s">{t("critical")}</Badge>;
              })()}
            </Row>
            <Column gap="4">
              <Text
                variant="display-strong-m"
                onBackground={
                  medicineAvailability === null
                    ? "neutral-strong"
                    : medicineAvailability >= 70
                    ? "success-strong"
                    : medicineAvailability >= 40
                    ? "warning-strong"
                    : "danger-strong"
                }
              >
                {medicineAvailability !== null ? `${medicineAvailability}%` : "..."}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("essentialMedicineAvailability")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium">
              {t("manageMedicines")}
            </Text>
          </Column>

          {/* Patient Footfall */}
          <Column
            padding="24"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="16"
            style={{ position: "relative", overflow: "hidden" }}
          >
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
            <Row horizontal="between" vertical="center" paddingTop="4">
              <Text variant="heading-strong-m">{t("todayPatients")}</Text>
              {todayPatientsCount !== null && todayPatientsCount > 0 ? (
                <Badge background="success-medium" textVariant="label-strong-s">{t("live")}</Badge>
              ) : (
                <Badge background="neutral-alpha-medium" textVariant="label-strong-s">{t("inactive")}</Badge>
              )}
            </Row>
            <Column gap="4">
              <Text variant="display-strong-m" onBackground={todayPatientsCount !== null && todayPatientsCount > 0 ? "success-strong" : "neutral-strong"}>
                {todayPatientsCount !== null ? todayPatientsCount : "..."}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("patientsProcessedToday")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text
              variant="label-default-s"
              onBackground="brand-medium"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/dashboard/hospital/patients")}
            >
              {t("logPatientVisit")}
            </Text>
          </Column>

          {/* Bed Occupancy */}
          <Column
            padding="24"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="16"
            style={{ position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #ef4444, #f97316)",
              }}
            />
            <Row horizontal="between" vertical="center" paddingTop="4">
              <Text variant="heading-strong-m">{t("bedOccupancy")}</Text>
              <Badge background="danger-medium" textVariant="label-strong-s">HIGH</Badge>
            </Row>
            <Column gap="4">
              <Text variant="display-strong-m" onBackground="danger-strong">18 / 20</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("bedsCurrentlyOccupied")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>
              {t("manageBeds")}
            </Text>
          </Column>

          {/* Staff Present */}
          <Column
            padding="24"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="16"
            style={{ position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
            <Row horizontal="between" vertical="center" paddingTop="4">
              <Text variant="heading-strong-m">{t("staffPresent")}</Text>
              {(() => {
                if (staffPresent === null || staffTotal === null || staffTotal === 0) {
                  return <Badge background="neutral-alpha-medium" textVariant="label-strong-s">UNKNOWN</Badge>;
                }
                const ratio = staffPresent / staffTotal;
                if (ratio === 1) return <Badge background="success-medium" textVariant="label-strong-s">{t("full")}</Badge>;
                if (ratio >= 0.7) return <Badge background="brand-medium" textVariant="label-strong-s">{t("normal")}</Badge>;
                if (ratio > 0) return <Badge background="warning-medium" textVariant="label-strong-s">{t("understaffed")}</Badge>;
                return <Badge background="danger-medium" textVariant="label-strong-s">{t("critical")}</Badge>;
              })()}
            </Row>
            <Column gap="4">
              <Text variant="display-strong-m" onBackground="brand-strong">
                {staffPresent !== null && staffTotal !== null ? `${staffPresent} / ${staffTotal}` : "... / ..."}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("doctorsStaffOnDuty")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text
              variant="label-default-s"
              onBackground="brand-medium"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/dashboard/hospital/attendance")}
            >
              {t("markAttendance")}
            </Text>
          </Column>

          {/* Blood Availability */}
          <Column
            padding="24"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="16"
            style={{ position: "relative", overflow: "hidden", cursor: "pointer" }}
            onClick={() => router.push("/dashboard/hospital/blood-availability")}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "3px",
                background: "linear-gradient(90deg, #ef4444, #dc2626)",
              }}
            />
            <Row horizontal="between" vertical="center" paddingTop="4">
              <Row gap="8" vertical="center">
                <Icon name="blood" size="s" onBackground="danger-medium" />
                <Text variant="heading-strong-m">{t("bloodBank")}</Text>
              </Row>
              {totalBloodUnits === 0 ? (
                <Badge background="warning-medium" textVariant="label-strong-s">{t("empty")}</Badge>
              ) : (
                <Badge background="success-medium" textVariant="label-strong-s">{t("normal")}</Badge>
              )}
            </Row>
            <Column gap="4">
              <Text variant="display-strong-m" onBackground="neutral-strong">
                {totalBloodUnits !== null ? `${totalBloodUnits} Units` : t("loading")}
              </Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("totalBloodUnits")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium">
              {t("manageBloodBank")}
            </Text>
          </Column>
        </div>
      </RevealFx>

      {/* Quick Actions */}
      <RevealFx translateY="16" delay={0.3} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="24">
          <Heading variant="heading-strong-l">{t("quickActions")}</Heading>
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

      {/* Recent Activity */}
      <RevealFx translateY="20" delay={0.4} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="20">
          <Row horizontal="between" vertical="center">
            <Heading variant="heading-strong-l">{t("recentActivity")}</Heading>
            <Text variant="label-default-s" onBackground="neutral-medium">{t("last24hours")}</Text>
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
    </Column>
  );
}
