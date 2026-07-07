"use client";

import { useEffect, useState, useMemo } from "react";
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
  Line,
  Icon,
} from "@once-ui-system/core";
import styles from "./attendance.module.scss";

interface Section {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface StaffMember {
  id: string;
  name: string;
  section_id: string;
  section_name: string;
  department_id: string;
  department_name: string;
  shift: "Morning" | "Evening" | "Night";
}

interface AttendanceRecord {
  id: string;
  staff_id: string;
  date: string;
  shift: string;
  time: string;
  status: "Present" | "Absent" | "Half Day" | "On Leave";
}

// Modal Component
function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <Row horizontal="between" vertical="center" fillWidth>
            <Heading variant="heading-strong-l">{title}</Heading>
            <Button variant="secondary" onClick={onClose} size="s">✕</Button>
          </Row>
        </div>
        <div className={styles.modalBody}>{children}</div>
        <div className={styles.modalFooter}>{footer}</div>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Domain state
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [todayRecords, setTodayRecords] = useState<Record<string, AttendanceRecord>>({});

  // Modals state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showSecModal, setShowSecModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [showDetailsStaff, setShowDetailsStaff] = useState<StaffMember | null>(null);
  const [historyRecords, setHistoryRecords] = useState<AttendanceRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filters state
  const [filterDept, setFilterDept] = useState("all");
  const [filterSec, setFilterSec] = useState("all");
  const [filterShift, setFilterShift] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Forms state
  const [staffForm, setStaffForm] = useState({
    name: "",
    section_id: "",
    department_id: "",
    shift: "Morning",
  });
  const [staffSaving, setStaffSaving] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);

  const [secForm, setSecForm] = useState({ name: "" });
  const [secSaving, setSecSaving] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  const [deptForm, setDeptForm] = useState({ name: "" });
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

  // Attendance marking form state
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().split("T")[0],
    shift: "Morning",
    time: "09:05 AM",
    status: "Present",
  });
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // Inline forms inside staff modal
  const [showInlineSec, setShowInlineSec] = useState(false);
  const [inlineSecName, setInlineSecName] = useState("");
  const [inlineSecSaving, setInlineSecSaving] = useState(false);
  const [inlineSecError, setInlineSecError] = useState<string | null>(null);

  const [showInlineDept, setShowInlineDept] = useState(false);
  const [inlineDeptName, setInlineDeptName] = useState("");
  const [inlineDeptSaving, setInlineDeptSaving] = useState(false);
  const [inlineDeptError, setInlineDeptError] = useState<string | null>(null);

  // Auth check
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

  // Load data
  const loadPageData = async () => {
    setLoadingData(true);
    try {
      const [staffRes, secRes, deptRes] = await Promise.all([
        fetch("/api/staff-members"),
        fetch("/api/staff-sections"),
        fetch("/api/staff-departments"),
      ]);

      if (!staffRes.ok || !secRes.ok || !deptRes.ok) {
        throw new Error("Failed to load records from server.");
      }

      const staffData = (await staffRes.json()) as StaffMember[];
      const secData = (await secRes.json()) as Section[];
      const deptData = (await deptRes.json()) as Department[];

      setStaff(staffData);
      setSections(secData);
      setDepartments(deptData);

      // Set default values for staffForm select fields
      if (secData.length > 0) setStaffForm((prev) => ({ ...prev, section_id: secData[0].id }));
      if (deptData.length > 0) setStaffForm((prev) => ({ ...prev, department_id: deptData[0].id }));

      // Fetch today's attendance for everyone
      const today = new Date().toISOString().split("T")[0];
      const recordsMap: Record<string, AttendanceRecord> = {};

      await Promise.all(
        staffData.map(async (m) => {
          try {
            const res = await fetch(`/api/staff-members/${m.id}/attendance`);
            if (res.ok) {
              const list = (await res.json()) as AttendanceRecord[];
              const todayRecord = list.find((r) => r.date === today);
              if (todayRecord) {
                recordsMap[m.id] = todayRecord;
              }
            }
          } catch (e) {
            console.error("Error loading attendance for " + m.id, e);
          }
        })
      );
      setTodayRecords(recordsMap);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && user) {
      loadPageData();
    }
  }, [loadingAuth, user]);

  // Fetch history for selected staff
  const loadStaffHistory = async (staffId: string) => {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/staff-members/${staffId}/attendance`);
      if (res.ok) {
        const data = await res.json();
        setHistoryRecords(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Combined search/filter (AND logic)
  const filteredStaff = useMemo(() => {
    return staff.filter((m) => {
      const todayRec = todayRecords[m.id];
      const todayStatus = todayRec ? todayRec.status : "Not Marked";

      const matchesDept = filterDept === "all" || m.department_id === filterDept;
      const matchesSec = filterSec === "all" || m.section_id === filterSec;
      const matchesShift = filterShift === "all" || m.shift === filterShift;
      const matchesStatus = filterStatus === "all" || todayStatus === filterStatus;

      return matchesDept && matchesSec && matchesShift && matchesStatus;
    });
  }, [staff, filterDept, filterSec, filterShift, filterStatus, todayRecords]);

  // Group staff by Section and then by Department
  const groupedStaff = useMemo(() => {
    const groups: Record<string, Record<string, StaffMember[]>> = {};

    // Initial empty groups for standard sections to keep layout clean
    sections.forEach((sec) => {
      groups[sec.name] = {};
    });

    filteredStaff.forEach((m) => {
      const secName = m.section_name || "Unassigned Section";
      const deptName = m.department_name || "Unassigned Department";

      if (!groups[secName]) {
        groups[secName] = {};
      }
      if (!groups[secName][deptName]) {
        groups[secName][deptName] = [];
      }
      groups[secName][deptName].push(m);
    });

    return groups;
  }, [filteredStaff, sections]);

  // Compute details stats for the selected staff member
  const detailsStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let half = 0;
    for (const r of historyRecords) {
      if (r.status === "Present") present++;
      else if (r.status === "Absent") absent++;
      else if (r.status === "On Leave") leave++;
      else if (r.status === "Half Day") half++;
    }
    return { present, absent, leave, half };
  }, [historyRecords]);

  // Form saving handlers
  const handleSaveStaff = async () => {
    const { name, section_id, department_id, shift } = staffForm;
    if (!name || !section_id || !department_id || !shift) {
      setStaffError("All fields are required.");
      return;
    }
    setStaffSaving(true);
    setStaffError(null);
    try {
      const res = await fetch("/api/staff-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, section_id, department_id, shift }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to register staff.");

      setStaff((prev) => [...prev, body]);
      setShowStaffModal(false);
      setStaffForm({
        name: "",
        section_id: sections[0]?.id || "",
        department_id: departments[0]?.id || "",
        shift: "Morning",
      });
    } catch (e: any) {
      setStaffError(e.message || "Failed to register staff.");
    } finally {
      setStaffSaving(false);
    }
  };

  const handleSaveSection = async (name: string, isInline = false) => {
    if (!name.trim()) {
      if (isInline) setInlineSecError("Name is required");
      else setSecError("Name is required");
      return;
    }
    if (isInline) {
      setInlineSecSaving(true);
      setInlineSecError(null);
    } else {
      setSecSaving(true);
      setSecError(null);
    }
    try {
      const res = await fetch("/api/staff-sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create section.");

      setSections((prev) => [...prev, body]);
      if (isInline) {
        setStaffForm((prev) => ({ ...prev, section_id: body.id }));
        setShowInlineSec(false);
        setInlineSecName("");
      } else {
        setShowSecModal(false);
        setSecForm({ name: "" });
      }
    } catch (e: any) {
      if (isInline) setInlineSecError(e.message);
      else setSecError(e.message);
    } finally {
      if (isInline) setInlineSecSaving(false);
      else setSecSaving(false);
    }
  };

  const handleSaveDepartment = async (name: string, isInline = false) => {
    if (!name.trim()) {
      if (isInline) setInlineDeptError("Name is required");
      else setDeptError("Name is required");
      return;
    }
    if (isInline) {
      setInlineDeptSaving(true);
      setInlineDeptError(null);
    } else {
      setDeptSaving(true);
      setDeptError(null);
    }
    try {
      const res = await fetch("/api/staff-departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to create department.");

      setDepartments((prev) => [...prev, body]);
      if (isInline) {
        setStaffForm((prev) => ({ ...prev, department_id: body.id }));
        setShowInlineDept(false);
        setInlineDeptName("");
      } else {
        setShowDeptModal(false);
        setDeptForm({ name: "" });
      }
    } catch (e: any) {
      if (isInline) setInlineDeptError(e.message);
      else setDeptError(e.message);
    } finally {
      if (isInline) setInlineDeptSaving(false);
      else setDeptSaving(false);
    }
  };

  // Mark attendance handler
  const handleSaveAttendance = async () => {
    if (!selectedStaff) return;
    const { date, shift, time, status } = attendanceForm;
    if (!date || !shift || !time || !status) {
      setAttendanceError("All fields are required.");
      return;
    }
    setAttendanceSaving(true);
    setAttendanceError(null);
    try {
      const res = await fetch(`/api/staff-members/${selectedStaff.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, shift, time, status }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to mark attendance.");

      // Update state for today's record if date matches today
      const todayStr = new Date().toISOString().split("T")[0];
      if (date === todayStr) {
        setTodayRecords((prev) => ({ ...prev, [selectedStaff.id]: body }));
      }

      // Reload history and close modal
      setSelectedStaff(null);
    } catch (e: any) {
      setAttendanceError(e.message || "Failed to save attendance.");
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Helper: checkin times mapping based on shift and status
  const updateAttendanceTime = (status: string, shift: string) => {
    let t = "--:--";
    if (status === "Present" || status === "Half Day") {
      if (shift === "Morning") t = "09:05 AM";
      if (shift === "Evening") t = "02:10 PM";
      if (shift === "Night") t = "10:02 PM";
    }
    setAttendanceForm((prev) => ({ ...prev, status, shift, time: t }));
  };

  // Helper to determine time-gated markable status
  const getMarkableStatus = (shift: string, selectedDateStr: string) => {
    if (!selectedDateStr) return { markable: true };
    const now = new Date();
    const [yr, mo, dy] = selectedDateStr.split("-").map(Number);
    const shiftStart = new Date(yr, mo - 1, dy);
    
    let hoursOffset = 0;
    let label = "";

    if (shift === "Morning") {
      hoursOffset = 8 + 6; // Starts 8 AM, available starting 2 PM
      label = "02:00 PM today";
    } else if (shift === "Evening") {
      hoursOffset = 16 + 6; // Starts 4 PM, available starting 10 PM
      label = "10:00 PM today";
    } else if (shift === "Night") {
      hoursOffset = 22 + 12; // Starts 10 PM, available starting 10 AM next day
      label = "10:00 AM tomorrow";
    }

    const unlockTime = new Date(shiftStart.getTime() + hoursOffset * 60 * 60 * 1000);

    if (now.getTime() < unlockTime.getTime()) {
      let availTimeStr = label;
      const todayStr = now.toISOString().split("T")[0];
      if (selectedDateStr !== todayStr) {
        const formattedDate = unlockTime.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric'
        });
        const formattedTime = unlockTime.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit'
        });
        availTimeStr = `${formattedTime} on ${formattedDate}`;
      }
      return { markable: false, availableAt: availTimeStr };
    }
    return { markable: true };
  };

  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: "100vh" }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
      </Column>
    );
  }

  return (
    <Column fillWidth paddingX="l" paddingY="xl" gap="32" className={styles.container}>
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
                <Icon name="person" size="m" onBackground="brand-medium" />
                <Heading variant="display-strong-s">Staff & Attendance</Heading>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Manage medical departments, sections, roster list and shift presence
              </Text>
            </Column>
          </Row>
          <Text variant="label-default-s" onBackground="neutral-medium">{user?.email}</Text>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Toolbar */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Row horizontal="between" vertical="center" fillWidth gap="12" wrap>
          <Heading variant="heading-strong-l">Duty Roster</Heading>
          <Row gap="8" wrap>
            <Button variant="secondary" size="s" onClick={() => setShowSecModal(true)}>
              + Add Section
            </Button>
            <Button variant="secondary" size="s" onClick={() => setShowDeptModal(true)}>
              + Add Department
            </Button>
            <Button variant="primary" size="s" onClick={() => setShowStaffModal(true)}>
              + Register Staff
            </Button>
          </Row>
        </Row>
      </RevealFx>

      {/* Filters Bar */}
      <RevealFx translateY="8" delay={0.12} fillWidth>
        <Row gap="12" vertical="center" fillWidth wrap>
          <select
            className={styles.inputField}
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            style={{ flex: 1, minWidth: "160px" }}
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            className={styles.inputField}
            value={filterSec}
            onChange={(e) => setFilterSec(e.target.value)}
            style={{ flex: 1, minWidth: "160px" }}
          >
            <option value="all">All Designations</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            className={styles.inputField}
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            style={{ flex: 1, minWidth: "160px" }}
          >
            <option value="all">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
          </select>

          <select
            className={styles.inputField}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ flex: 1, minWidth: "160px" }}
          >
            <option value="all">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
            <option value="Half Day">Half Day</option>
            <option value="On Leave">On Leave</option>
            <option value="Not Marked">Not Marked</option>
          </select>
        </Row>
      </RevealFx>

      {/* Main Staff Sections & Nested Departments */}
      <RevealFx translateY="12" delay={0.15} fillWidth>
        {loadingData ? (
          <Column fillWidth gap="12">
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </Column>
        ) : (
          <Column gap="24" fillWidth>
            {Object.entries(groupedStaff).map(([sectionName, departmentsMap]) => {
              const totalSectionStaff = Object.values(departmentsMap).reduce(
                (acc, list) => acc + list.length,
                0
              );

              return (
                <Column
                  key={sectionName}
                  gap="16"
                  border="neutral-alpha-weak"
                  radius="l"
                  padding="24"
                  background="surface"
                  fillWidth
                >
                  <Row horizontal="between" vertical="center">
                    <Row gap="8" vertical="center">
                      <Heading variant="heading-strong-l">{sectionName}</Heading>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        ({totalSectionStaff} Registered)
                      </Text>
                    </Row>
                  </Row>
                  <Line background="neutral-alpha-weak" />

                  {totalSectionStaff === 0 ? (
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      No staff registered in this section.
                    </Text>
                  ) : (
                    <Column gap="20" fillWidth>
                      {Object.entries(departmentsMap).map(([deptName, members]) => (
                        <Column key={deptName} gap="8" fillWidth>
                          <Text variant="label-strong-s" onBackground="neutral-weak">
                            {deptName}
                          </Text>
                          <div className={styles.tableContainer}>
                            <table className={styles.table}>
                              <thead>
                                <tr>
                                  <th style={{ width: "35%" }}>Name</th>
                                  <th style={{ width: "20%" }}>Roster Shift</th>
                                  <th style={{ width: "25%" }}>Today&apos;s Status</th>
                                  <th style={{ width: "20%" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {members.map((m) => {
                                  const todayRec = todayRecords[m.id];
                                  return (
                                    <tr key={m.id} className={styles.card}>
                                      <td>
                                        <Text variant="body-strong-s">{m.name}</Text>
                                      </td>
                                      <td>
                                        <span
                                          className={`${styles.shiftBadge} ${
                                            m.shift === "Morning"
                                              ? styles.shiftMorning
                                              : m.shift === "Evening"
                                              ? styles.shiftEvening
                                              : styles.shiftNight
                                          }`}
                                        >
                                          {m.shift}
                                        </span>
                                      </td>
                                      <td>
                                        {todayRec ? (
                                          <Row gap="8" vertical="center">
                                            <span
                                              className={`${styles.shiftBadge} ${
                                                todayRec.status === "Present"
                                                  ? styles.statusPresent
                                                  : todayRec.status === "Absent"
                                                  ? styles.statusAbsent
                                                  : todayRec.status === "Half Day"
                                                  ? styles.statusHalf
                                                  : styles.statusLeave
                                              }`}
                                            >
                                              {todayRec.status}
                                            </span>
                                            <Text variant="body-default-xs" onBackground="neutral-weak">
                                              ({todayRec.time})
                                            </Text>
                                          </Row>
                                        ) : (
                                          <Text variant="body-default-xs" onBackground="neutral-medium">
                                            Not Marked
                                          </Text>
                                        )}
                                      </td>
                                      <td>
                                        <Row gap="8">
                                          <Button
                                            variant="primary"
                                            size="s"
                                            onClick={() => {
                                              setSelectedStaff(m);
                                              const todayStr = new Date().toISOString().split("T")[0];
                                              const existing = todayRecords[m.id];
                                              setAttendanceForm({
                                                date: todayStr,
                                                shift: existing?.shift || m.shift,
                                                time: existing?.time || "09:05 AM",
                                                status: existing?.status || "Present",
                                              });
                                              setAttendanceError(null);
                                              loadStaffHistory(m.id);
                                            }}
                                          >
                                            Mark
                                          </Button>
                                          <Button
                                            variant="secondary"
                                            size="s"
                                            onClick={() => {
                                              setShowDetailsStaff(m);
                                              loadStaffHistory(m.id);
                                            }}
                                          >
                                            Details
                                          </Button>
                                        </Row>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </Column>
                      ))}
                    </Column>
                  )}
                </Column>
              );
            })}
          </Column>
        )}
      </RevealFx>

      {/* Add Section Modal */}
      {showSecModal && (
        <Modal title="Add Section" onClose={() => setShowSecModal(false)} footer={
          <Row gap="12" horizontal="end" fillWidth>
            <Button variant="secondary" onClick={() => setShowSecModal(false)} disabled={secSaving}>Cancel</Button>
            <Button variant="primary" onClick={() => handleSaveSection(secForm.name)} disabled={secSaving}>Save</Button>
          </Row>
        }>
          <Column gap="12">
            {secError && <span className={styles.errorText}>{secError}</span>}
            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Section Name</Text>
              <input
                className={styles.inputField}
                type="text"
                value={secForm.name}
                onChange={(e) => setSecForm({ name: e.target.value })}
                placeholder="e.g. Ward Boy, Security Guard"
                disabled={secSaving}
              />
            </div>
          </Column>
        </Modal>
      )}

      {/* Add Department Modal */}
      {showDeptModal && (
        <Modal title="Add Department" onClose={() => setShowDeptModal(false)} footer={
          <Row gap="12" horizontal="end" fillWidth>
            <Button variant="secondary" onClick={() => setShowDeptModal(false)} disabled={deptSaving}>Cancel</Button>
            <Button variant="primary" onClick={() => handleSaveDepartment(deptForm.name)} disabled={deptSaving}>Save</Button>
          </Row>
        }>
          <Column gap="12">
            {deptError && <span className={styles.errorText}>{deptError}</span>}
            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Department Name</Text>
              <input
                className={styles.inputField}
                type="text"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ name: e.target.value })}
                placeholder="e.g. ICU, Pediatrics"
                disabled={deptSaving}
              />
            </div>
          </Column>
        </Modal>
      )}

      {/* Register Staff Modal */}
      {showStaffModal && (
        <Modal title="Register Staff Member" onClose={() => setShowStaffModal(false)} footer={
          <Row gap="12" horizontal="end" fillWidth>
            <Button variant="secondary" onClick={() => setShowStaffModal(false)} disabled={staffSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveStaff} disabled={staffSaving}>Register</Button>
          </Row>
        }>
          <Column gap="16">
            {staffError && <span className={styles.errorText}>{staffError}</span>}

            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Staff Name</Text>
              <input
                className={styles.inputField}
                type="text"
                value={staffForm.name}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Nurse Shalini Sen"
                disabled={staffSaving}
              />
            </div>

            {/* Section field with inline creator */}
            <div className={styles.fieldGroup}>
              <Row horizontal="between" vertical="center" fillWidth>
                <Text variant="label-default-s" onBackground="neutral-medium">Section</Text>
                {!showInlineSec && (
                  <Text
                    variant="label-default-xs"
                    onBackground="brand-medium"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      setShowInlineSec(true);
                      setInlineSecError(null);
                    }}
                  >
                    + Add New
                  </Text>
                )}
              </Row>
              <select
                className={styles.inputField}
                value={staffForm.section_id}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, section_id: e.target.value }))}
                disabled={staffSaving || showInlineSec}
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {showInlineSec && (
                <Column gap="8" fillWidth style={{ marginTop: "8px" }}>
                  <Row gap="8" fillWidth>
                    <input
                      className={styles.inputField}
                      type="text"
                      placeholder="New section name"
                      value={inlineSecName}
                      onChange={(e) => setInlineSecName(e.target.value)}
                      disabled={inlineSecSaving}
                      style={{ flex: 1 }}
                    />
                    <Button variant="primary" size="s" onClick={() => handleSaveSection(inlineSecName, true)} disabled={inlineSecSaving}>Save</Button>
                    <Button variant="secondary" size="s" onClick={() => { setShowInlineSec(false); setInlineSecName(""); }} disabled={inlineSecSaving}>✕</Button>
                  </Row>
                  {inlineSecError && <span className={styles.errorText}>{inlineSecError}</span>}
                </Column>
              )}
            </div>

            {/* Department field with inline creator */}
            <div className={styles.fieldGroup}>
              <Row horizontal="between" vertical="center" fillWidth>
                <Text variant="label-default-s" onBackground="neutral-medium">Department</Text>
                {!showInlineDept && (
                  <Text
                    variant="label-default-xs"
                    onBackground="brand-medium"
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    onClick={() => {
                      setShowInlineDept(true);
                      setInlineDeptError(null);
                    }}
                  >
                    + Add New
                  </Text>
                )}
              </Row>
              <select
                className={styles.inputField}
                value={staffForm.department_id}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, department_id: e.target.value }))}
                disabled={staffSaving || showInlineDept}
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>

              {showInlineDept && (
                <Column gap="8" fillWidth style={{ marginTop: "8px" }}>
                  <Row gap="8" fillWidth>
                    <input
                      className={styles.inputField}
                      type="text"
                      placeholder="New department name"
                      value={inlineDeptName}
                      onChange={(e) => setInlineDeptName(e.target.value)}
                      disabled={inlineDeptSaving}
                      style={{ flex: 1 }}
                    />
                    <Button variant="primary" size="s" onClick={() => handleSaveDepartment(inlineDeptName, true)} disabled={inlineDeptSaving}>Save</Button>
                    <Button variant="secondary" size="s" onClick={() => { setShowInlineDept(false); setInlineDeptName(""); }} disabled={inlineDeptSaving}>✕</Button>
                  </Row>
                  {inlineDeptError && <span className={styles.errorText}>{inlineDeptError}</span>}
                </Column>
              )}
            </div>

            {/* Shift */}
            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Default Roster Shift</Text>
              <select
                className={styles.inputField}
                value={staffForm.shift}
                onChange={(e) => setStaffForm((prev) => ({ ...prev, shift: e.target.value as any }))}
                disabled={staffSaving}
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </Column>
        </Modal>
      )}

      {/* Attendance & History Modal */}
      {selectedStaff && (() => {
        const { markable, availableAt } = getMarkableStatus(selectedStaff.shift, attendanceForm.date);
        return (
          <Modal title={`Attendance - ${selectedStaff.name}`} onClose={() => setSelectedStaff(null)} footer={
            <Row gap="12" horizontal="end" fillWidth>
              <Button variant="secondary" onClick={() => setSelectedStaff(null)} disabled={attendanceSaving}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveAttendance} disabled={attendanceSaving || !markable}>Save Attendance</Button>
            </Row>
          }>
            <Column gap="20" fillWidth>
              {/* Mark Section */}
              <Column gap="12" fillWidth>
                <Heading variant="heading-strong-m">Mark Today&apos;s Attendance</Heading>
                
                <div className={styles.fieldGroup}>
                  <Text variant="label-default-s" onBackground="neutral-medium">Date</Text>
                  <input
                    className={styles.inputField}
                    type="date"
                    value={attendanceForm.date}
                    onChange={(e) => {
                      setAttendanceForm((prev) => ({ ...prev, date: e.target.value }));
                      setAttendanceError(null);
                    }}
                    disabled={attendanceSaving}
                  />
                </div>

                {!markable ? (
                  <Column gap="8" padding="16" background="neutral-alpha-weak" border="neutral-alpha-medium" radius="m">
                    <Row gap="8" vertical="center">
                      <Icon name="info" size="s" onBackground="warning-medium" />
                      <Text variant="body-strong-s" onBackground="warning-strong">Shift Locked</Text>
                    </Row>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {selectedStaff.name}&apos;s shift is {selectedStaff.shift} (starts at {selectedStaff.shift === "Morning" ? "8:00 AM" : selectedStaff.shift === "Evening" ? "4:00 PM" : "10:00 PM"}). Attendance can only be marked starting {selectedStaff.shift === "Night" ? "12 hours" : "6 hours"} after shift start.
                    </Text>
                    <Text variant="body-strong-s">Available at: {availableAt}</Text>
                  </Column>
                ) : (
                  <>
                    {attendanceError && <span className={styles.errorText}>{attendanceError}</span>}

                    <Row gap="12" fillWidth>
                      <div className={styles.fieldGroup} style={{ flex: 1 }}>
                        <Text variant="label-default-s" onBackground="neutral-medium">Status</Text>
                        <select
                          className={styles.inputField}
                          value={attendanceForm.status}
                          onChange={(e) => updateAttendanceTime(e.target.value, attendanceForm.shift)}
                          disabled={attendanceSaving}
                        >
                          <option value="Present">Present</option>
                          <option value="Absent">Absent</option>
                          <option value="Half Day">Half Day</option>
                          <option value="On Leave">On Leave</option>
                        </select>
                      </div>

                      <div className={styles.fieldGroup} style={{ flex: 1 }}>
                        <Text variant="label-default-s" onBackground="neutral-medium">Shift</Text>
                        <select
                          className={styles.inputField}
                          value={attendanceForm.shift}
                          onChange={(e) => updateAttendanceTime(attendanceForm.status, e.target.value)}
                          disabled={attendanceSaving}
                        >
                          <option value="Morning">Morning</option>
                          <option value="Evening">Evening</option>
                          <option value="Night">Night</option>
                        </select>
                      </div>
                    </Row>

                    <Row gap="12" fillWidth>
                      <div className={styles.fieldGroup} style={{ flex: 1 }}>
                        <Text variant="label-default-s" onBackground="neutral-medium">Checkin Time</Text>
                        <input
                          className={styles.inputField}
                          type="text"
                          value={attendanceForm.time}
                          onChange={(e) => setAttendanceForm((prev) => ({ ...prev, time: e.target.value }))}
                          disabled={attendanceSaving || (attendanceForm.status !== "Present" && attendanceForm.status !== "Half Day")}
                          placeholder="e.g. 09:05 AM"
                        />
                      </div>
                    </Row>
                  </>
                )}
              </Column>

            <Line background="neutral-alpha-weak" />

            {/* History Section */}
            <Column gap="8" fillWidth>
              <Heading variant="heading-strong-m">Roster History (Last 10 Days)</Heading>
              {loadingHistory ? (
                <Text variant="body-default-xs" onBackground="neutral-weak">Loading history...</Text>
              ) : historyRecords.length === 0 ? (
                <Text variant="body-default-xs" onBackground="neutral-weak">No past attendance logs found.</Text>
              ) : (
                <Column gap="4" style={{ maxHeight: "150px", overflowY: "auto" }}>
                  {historyRecords.slice(0, 10).map((h) => (
                    <Row key={h.id} horizontal="between" paddingY="4" border="neutral-alpha-weak" style={{ borderBottom: "1px solid var(--neutral-alpha-weak)" }}>
                      <Text variant="body-strong-xs">{h.date}</Text>
                      <Row gap="8">
                        <Text variant="body-default-xs">{h.shift}</Text>
                        <span
                          className={`${styles.shiftBadge} ${
                            h.status === "Present"
                              ? styles.statusPresent
                              : h.status === "Absent"
                              ? styles.statusAbsent
                              : h.status === "Half Day"
                              ? styles.statusHalf
                              : styles.statusLeave
                          }`}
                          style={{ fontSize: "10px", padding: "1px 6px" }}
                        >
                          {h.status}
                        </span>
                      </Row>
                    </Row>
                  ))}
                </Column>
              )}
            </Column>
            </Column>
          </Modal>
        );
      })()}

      {/* Details Modal */}
      {showDetailsStaff && (
        <Modal
          title={`Staff Details - ${showDetailsStaff.name}`}
          onClose={() => setShowDetailsStaff(null)}
          footer={
            <Row gap="12" horizontal="end" fillWidth>
              <Button variant="secondary" onClick={() => setShowDetailsStaff(null)}>Close</Button>
            </Row>
          }
        >
          <Column gap="16" fillWidth>
            <Column gap="4">
              <Text variant="label-default-s" onBackground="neutral-medium">Section (Designation)</Text>
              <Text variant="body-strong-s">{showDetailsStaff.section_name}</Text>
            </Column>
            <Column gap="4">
              <Text variant="label-default-s" onBackground="neutral-medium">Department</Text>
              <Text variant="body-strong-s">{showDetailsStaff.department_name}</Text>
            </Column>
            <Column gap="4">
              <Text variant="label-default-s" onBackground="neutral-medium">Default Roster Shift</Text>
              <Text variant="body-strong-s">{showDetailsStaff.shift}</Text>
            </Column>

            <Line background="neutral-alpha-weak" />

            <Heading variant="heading-strong-m">Attendance Summary (Roster Logs)</Heading>

            {loadingHistory ? (
              <Text variant="body-default-xs" onBackground="neutral-weak">Loading statistics...</Text>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                  width: "100%",
                }}
              >
                <Column padding="12" background="success-alpha-weak" border="success-alpha-medium" radius="m" gap="4">
                  <Text variant="label-default-xs" onBackground="success-strong">Days Present</Text>
                  <Text variant="heading-strong-m">{detailsStats.present}</Text>
                </Column>
                <Column padding="12" background="danger-alpha-weak" border="danger-alpha-medium" radius="m" gap="4">
                  <Text variant="label-default-xs" onBackground="danger-strong">Days Absent</Text>
                  <Text variant="heading-strong-m">{detailsStats.absent}</Text>
                </Column>
                <Column padding="12" background="neutral-alpha-medium" border="neutral-alpha-strong" radius="m" gap="4">
                  <Text variant="label-default-xs" onBackground="neutral-strong">Days On Leave</Text>
                  <Text variant="heading-strong-m">{detailsStats.leave}</Text>
                </Column>
                <Column padding="12" background="warning-alpha-weak" border="warning-alpha-medium" radius="m" gap="4">
                  <Text variant="label-default-xs" onBackground="warning-strong">Half Days</Text>
                  <Text variant="heading-strong-m">{detailsStats.half}</Text>
                </Column>
              </div>
            )}
          </Column>
        </Modal>
      )}
    </Column>
  );
}
