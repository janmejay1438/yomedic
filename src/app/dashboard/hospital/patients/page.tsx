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
import styles from "./patients.module.scss";

interface Department {
  id: string;
  name: string;
}

interface Patient {
  id: string;
  registration_date: string;
  visit_type: "New Registration" | "Follow-up Visit";
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  department_id: string;
  department_name?: string;
  consulting_doctor: string;
  updated_at: string;
}

// Dialog Primitive
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
        <div className={styles.modalBody}>
          {children}
        </div>
        <div className={styles.modalFooter}>
          {footer}
        </div>
      </div>
    </div>
  );
}

export default function PatientsPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Patients & Departments State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterVisit, setFilterVisit] = useState("all");

  // Editing state per patient ID
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  // Deleting confirmation state
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Patient Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    age: "",
    gender: "Male",
    visit_type: "New Registration",
    department_id: "",
    registration_date: new Date().toISOString().split("T")[0],
    consulting_doctor: "",
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Inline Department Addition State
  const [showInlineDept, setShowInlineDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);

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

  // Fetch initial data
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [patientsRes, deptsRes] = await Promise.all([
        fetch("/api/patients"),
        fetch("/api/departments"),
      ]);

      if (!patientsRes.ok || !deptsRes.ok) {
        throw new Error("Failed to load records from server.");
      }

      const patientsData = await patientsRes.json();
      const deptsData = await deptsRes.json();

      setPatients(patientsData);
      setDepartments(deptsData);

      // Set default department in add form if available
      if (deptsData.length > 0) {
        setAddForm((prev) => ({ ...prev, department_id: deptsData[0].id }));
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && user) {
      fetchData();
    }
  }, [loadingAuth, user]);

  // Combined client search and filter
  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.consulting_doctor.toLowerCase().includes(search.toLowerCase());
      const matchesDept = filterDept === "all" || p.department_id === filterDept;
      const matchesVisit = filterVisit === "all" || p.visit_type === filterVisit;
      return matchesSearch && matchesDept && matchesVisit;
    });
  }, [patients, search, filterDept, filterVisit]);

  // Edit action handlers
  const startEdit = (patient: Patient) => {
    setEditingId(patient.id);
    setEditForm({ ...patient });
    setRowError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setRowError(null);
  };

  const handleEditChange = (key: keyof Patient, value: any) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveEdit = async (id: string) => {
    // Basic validation
    if (
      !editForm.name ||
      !editForm.age ||
      !editForm.gender ||
      !editForm.visit_type ||
      !editForm.department_id ||
      !editForm.registration_date ||
      !editForm.consulting_doctor
    ) {
      setRowError("All fields are required.");
      return;
    }

    const ageNum = Number(editForm.age);
    if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum <= 0) {
      setRowError("Age must be a positive integer.");
      return;
    }

    setSavingId(id);
    setRowError(null);

    try {
      const res = await fetch(`/api/patients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          age: ageNum,
          gender: editForm.gender,
          visit_type: editForm.visit_type,
          department_id: editForm.department_id,
          registration_date: editForm.registration_date,
          consulting_doctor: editForm.consulting_doctor,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to save updates.");
      }

      // Update state
      setPatients((prev) => prev.map((p) => (p.id === id ? body : p)));
      setEditingId(null);
      setEditForm({});
    } catch (err: any) {
      console.error(err);
      setRowError(err.message || "Failed to update record.");
    } finally {
      setSavingId(null);
    }
  };

  // Delete handlers
  const confirmDelete = async () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to delete patient record.");
      }

      setPatients((prev) => prev.filter((p) => p.id !== patientToDelete.id));
      setPatientToDelete(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Add Patient handler
  const handleAddSubmit = async () => {
    const { name, age, gender, visit_type, department_id, registration_date, consulting_doctor } = addForm;

    if (!name || !age || !gender || !visit_type || !department_id || !registration_date || !consulting_doctor) {
      setAddError("All fields are required.");
      return;
    }

    const ageNum = Number(age);
    if (isNaN(ageNum) || !Number.isInteger(ageNum) || ageNum <= 0) {
      setAddError("Age must be a positive integer.");
      return;
    }

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: ageNum,
          gender,
          visit_type,
          department_id,
          registration_date,
          consulting_doctor,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to register patient.");
      }

      setPatients((prev) => [body, ...prev]);
      setShowAddModal(false);
      // Reset form
      setAddForm({
        name: "",
        age: "",
        gender: "Male",
        visit_type: "New Registration",
        department_id: departments[0]?.id || "",
        registration_date: new Date().toISOString().split("T")[0],
        consulting_doctor: "",
      });
    } catch (err: any) {
      console.error(err);
      setAddError(err.message || "An error occurred while saving.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddDept = async () => {
    if (!newDeptName.trim()) {
      setDeptError("Department name cannot be empty.");
      return;
    }
    setDeptSaving(true);
    setDeptError(null);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDeptName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to add department.");
      }
      setDepartments((prev) => [...prev, body]);
      setAddForm((prev) => ({ ...prev, department_id: body.id }));
      setShowInlineDept(false);
      setNewDeptName("");
    } catch (err: any) {
      console.error(err);
      setDeptError(err.message || "Failed to add department.");
    } finally {
      setDeptSaving(false);
    }
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
                <Heading variant="display-strong-s">Patient Records</Heading>
              </Row>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Register patients, log visits, and manage consultation records
              </Text>
            </Column>
          </Row>
          <Text variant="label-default-s" onBackground="neutral-medium">{user?.email}</Text>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Action Toolbar */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Column gap="16" fillWidth>
          <Row horizontal="between" vertical="center" fillWidth gap="12" wrap>
            <Heading variant="heading-strong-l">All Registered Visits</Heading>
            <Button variant="primary" size="s" onClick={() => setShowAddModal(true)}>
              + Register Patient
            </Button>
          </Row>

          <Row gap="12" vertical="center" fillWidth wrap>
            <input
              className={styles.inputField}
              type="text"
              placeholder="🔍 Search name or doctor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 2, minWidth: "220px" }}
            />

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
              value={filterVisit}
              onChange={(e) => setFilterVisit(e.target.value)}
              style={{ flex: 1, minWidth: "160px" }}
            >
              <option value="all">All Visit Types</option>
              <option value="New Registration">New Registration</option>
              <option value="Follow-up Visit">Follow-up Visit</option>
            </select>
          </Row>
        </Column>
      </RevealFx>

      {/* Patient Table */}
      <RevealFx translateY="12" delay={0.15} fillWidth>
        {loadingData ? (
          <Column fillWidth gap="12">
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </Column>
        ) : filteredPatients.length === 0 ? (
          <Column fillWidth padding="40" horizontal="center" background="surface" border="neutral-alpha-weak" radius="l">
            <Text variant="body-default-m" onBackground="neutral-weak">
              {patients.length === 0 ? "No patient records registered yet." : "No records match search criteria."}
            </Text>
          </Column>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "13%" }}>Reg. Date</th>
                  <th style={{ width: "15%" }}>Visit Type</th>
                  <th style={{ width: "18%" }}>Name</th>
                  <th style={{ width: "8%" }}>Age</th>
                  <th style={{ width: "10%" }}>Gender</th>
                  <th style={{ width: "16%" }}>Department</th>
                  <th style={{ width: "18%" }}>Consulting Doctor</th>
                  <th style={{ width: "12%" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p) => {
                  const isEditing = editingId === p.id;
                  const isSaving = savingId === p.id;

                  return (
                    <tr key={p.id}>
                      {/* Registration Date */}
                      <td>
                        {isEditing ? (
                          <input
                            className={styles.inputField}
                            type="date"
                            value={editForm.registration_date || ""}
                            onChange={(e) => handleEditChange("registration_date", e.target.value)}
                            disabled={isSaving}
                          />
                        ) : (
                          <Text variant="body-default-s">{p.registration_date}</Text>
                        )}
                      </td>

                      {/* Visit Type */}
                      <td>
                        {isEditing ? (
                          <select
                            className={styles.inputField}
                            value={editForm.visit_type || ""}
                            onChange={(e) => handleEditChange("visit_type", e.target.value)}
                            disabled={isSaving}
                          >
                            <option value="New Registration">New Registration</option>
                            <option value="Follow-up Visit">Follow-up Visit</option>
                          </select>
                        ) : (
                          <span
                            className={`${styles.badge} ${
                              p.visit_type === "New Registration" ? styles.badgeNew : styles.badgeFollow
                            }`}
                          >
                            {p.visit_type}
                          </span>
                        )}
                      </td>

                      {/* Name */}
                      <td>
                        {isEditing ? (
                          <input
                            className={styles.inputField}
                            type="text"
                            value={editForm.name || ""}
                            onChange={(e) => handleEditChange("name", e.target.value)}
                            disabled={isSaving}
                          />
                        ) : (
                          <Text variant="body-strong-s">{p.name}</Text>
                        )}
                      </td>

                      {/* Age */}
                      <td>
                        {isEditing ? (
                          <input
                            className={styles.inputField}
                            type="number"
                            min="1"
                            value={editForm.age || ""}
                            onChange={(e) => handleEditChange("age", e.target.value)}
                            disabled={isSaving}
                            style={{ maxWidth: "70px" }}
                          />
                        ) : (
                          <Text variant="body-default-s">{p.age}</Text>
                        )}
                      </td>

                      {/* Gender */}
                      <td>
                        {isEditing ? (
                          <select
                            className={styles.inputField}
                            value={editForm.gender || ""}
                            onChange={(e) => handleEditChange("gender", e.target.value)}
                            disabled={isSaving}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeGender}`}>
                            {p.gender}
                          </span>
                        )}
                      </td>

                      {/* Department */}
                      <td>
                        {isEditing ? (
                          <select
                            className={styles.inputField}
                            value={editForm.department_id || ""}
                            onChange={(e) => handleEditChange("department_id", e.target.value)}
                            disabled={isSaving}
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          <Text variant="body-default-s">{p.department_name}</Text>
                        )}
                      </td>

                      {/* Consulting Doctor */}
                      <td>
                        {isEditing ? (
                          <input
                            className={styles.inputField}
                            type="text"
                            value={editForm.consulting_doctor || ""}
                            onChange={(e) => handleEditChange("consulting_doctor", e.target.value)}
                            disabled={isSaving}
                          />
                        ) : (
                          <Text variant="body-default-s">{p.consulting_doctor}</Text>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <Column gap="4">
                          <div className={styles.actionCell}>
                            {isEditing ? (
                              <>
                                <Button
                                  variant="primary"
                                  size="s"
                                  onClick={() => saveEdit(p.id)}
                                  disabled={isSaving}
                                >
                                  {isSaving ? "Saving" : "Save"}
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="s"
                                  onClick={cancelEdit}
                                  disabled={isSaving}
                                >
                                  ✕
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="secondary"
                                  size="s"
                                  onClick={() => startEdit(p)}
                                  prefixIcon="edit"
                                  style={{ padding: "8px" }}
                                />
                                <Button
                                  variant="secondary"
                                  size="s"
                                  onClick={() => setPatientToDelete(p)}
                                  prefixIcon="trash"
                                  style={{ padding: "8px" }}
                                />
                              </>
                            )}
                          </div>
                          {isEditing && rowError && (
                            <span className={styles.errorText}>{rowError}</span>
                          )}
                        </Column>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </RevealFx>

      {/* Add Patient Modal */}
      {showAddModal && (
        <Modal title="Register Patient" onClose={() => setShowAddModal(false)} footer={
          <Row gap="12" horizontal="end" fillWidth>
            <Button variant="secondary" onClick={() => setShowAddModal(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSubmit} disabled={isAdding}>
              {isAdding ? "Registering..." : "Register"}
            </Button>
          </Row>
        }>
          <Column gap="16">
            {addError && <span className={styles.errorText}>{addError}</span>}
            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Patient Name</Text>
              <input
                className={styles.inputField}
                type="text"
                value={addForm.name}
                onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Ramesh Kumar"
                disabled={isAdding}
              />
            </div>

            <Row gap="12">
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <Text variant="label-default-s" onBackground="neutral-medium">Age</Text>
                <input
                  className={styles.inputField}
                  type="number"
                  min="1"
                  value={addForm.age}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, age: e.target.value }))}
                  placeholder="e.g. 45"
                  disabled={isAdding}
                />
              </div>

              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <Text variant="label-default-s" onBackground="neutral-medium">Gender</Text>
                <select
                  className={styles.inputField}
                  value={addForm.gender}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, gender: e.target.value }))}
                  disabled={isAdding}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </Row>

            <Row gap="12">
              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <Text variant="label-default-s" onBackground="neutral-medium">Visit Type</Text>
                <select
                  className={styles.inputField}
                  value={addForm.visit_type}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, visit_type: e.target.value }))}
                  disabled={isAdding}
                >
                  <option value="New Registration">New Registration</option>
                  <option value="Follow-up Visit">Follow-up Visit</option>
                </select>
              </div>

              <div className={styles.fieldGroup} style={{ flex: 1 }}>
                <Row horizontal="between" vertical="center" fillWidth>
                  <Text variant="label-default-s" onBackground="neutral-medium">Department</Text>
                  {!showInlineDept && (
                    <Text
                      variant="label-default-xs"
                      onBackground="brand-medium"
                      style={{ cursor: "pointer", textDecoration: "underline" }}
                      onClick={() => {
                        setShowInlineDept(true);
                        setDeptError(null);
                      }}
                    >
                      + Add New
                    </Text>
                  )}
                </Row>
                <select
                  className={styles.inputField}
                  value={addForm.department_id}
                  onChange={(e) => setAddForm((prev) => ({ ...prev, department_id: e.target.value }))}
                  disabled={isAdding || showInlineDept}
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
                        value={newDeptName}
                        onChange={(e) => setNewDeptName(e.target.value)}
                        disabled={deptSaving}
                        style={{ flex: 1 }}
                      />
                      <Button
                        variant="primary"
                        size="s"
                        onClick={handleAddDept}
                        disabled={deptSaving}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="s"
                        onClick={() => {
                          setShowInlineDept(false);
                          setNewDeptName("");
                          setDeptError(null);
                        }}
                        disabled={deptSaving}
                      >
                        ✕
                      </Button>
                    </Row>
                    {deptError && <span className={styles.errorText}>{deptError}</span>}
                  </Column>
                )}
              </div>
            </Row>

            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Registration Date</Text>
              <input
                className={styles.inputField}
                type="date"
                value={addForm.registration_date}
                onChange={(e) => setAddForm((prev) => ({ ...prev, registration_date: e.target.value }))}
                disabled={isAdding}
              />
            </div>

            <div className={styles.fieldGroup}>
              <Text variant="label-default-s" onBackground="neutral-medium">Consulting Doctor</Text>
              <input
                className={styles.inputField}
                type="text"
                value={addForm.consulting_doctor}
                onChange={(e) => setAddForm((prev) => ({ ...prev, consulting_doctor: e.target.value }))}
                placeholder="e.g. Dr. Anita Sharma"
                disabled={isAdding}
              />
            </div>
          </Column>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {patientToDelete && (
        <Modal title="Confirm Delete" onClose={() => setPatientToDelete(null)} footer={
          <Row gap="12" horizontal="end" fillWidth>
            <Button variant="secondary" onClick={() => setPatientToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </Row>
        }>
          <Column gap="8">
            <Text variant="body-default-m">
              Are you sure you want to delete patient record for <strong>{patientToDelete.name}</strong>?
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              This action will remove the record from local databases.
            </Text>
          </Column>
        </Modal>
      )}
    </Column>
  );
}
