"use client";

import { useEffect, useState } from "react";
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
  useToast,
  Icon,
} from "@once-ui-system/core";
import styles from "./blood-availability.module.scss";

interface BloodRecord {
  id: string;
  blood_type: string;
  quantity_units: number;
  collection_date: string | null;
  expiry_date: string | null;
  updated_at: string;
}

export default function BloodAvailabilityPage() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [originalData, setOriginalData] = useState<BloodRecord[]>([]);
  const [editedData, setEditedData] = useState<BloodRecord[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingRows, setSavingRows] = useState<Record<string, boolean>>({});
  
  const router = useRouter();
  const { addToast } = useToast();

  // Auth Guard
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

  // Fetch data
  const fetchData = async () => {
    setLoadingData(true);
    try {
      const res = await fetch("/api/blood-inventory");
      if (!res.ok) {
        throw new Error("Failed to load blood inventory.");
      }
      const data = await res.json();
      setOriginalData(data);
      setEditedData(JSON.parse(JSON.stringify(data)));
    } catch (err: any) {
      console.error(err);
      addToast({
        variant: "danger",
        message: err.message || "Failed to load blood inventory.",
      });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (!loadingAuth && user) {
      fetchData();
    }
  }, [loadingAuth, user]);

  const handleFieldChange = (rowId: string, field: keyof BloodRecord, value: any) => {
    setEditedData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return { ...row, [field]: value };
        }
        return row;
      })
    );

    // Clear error for that row once user edits again
    if (rowErrors[rowId]) {
      setRowErrors((prev) => {
        const next = { ...prev };
        delete next[rowId];
        return next;
      });
    }
  };

  const isRowDirty = (rowId: string) => {
    const orig = originalData.find((r) => r.id === rowId);
    const edit = editedData.find((r) => r.id === rowId);
    if (!orig || !edit) return false;
    return (
      orig.quantity_units !== edit.quantity_units ||
      (orig.collection_date ?? "") !== (edit.collection_date ?? "") ||
      (orig.expiry_date ?? "") !== (edit.expiry_date ?? "")
    );
  };

  const handleSave = async (rowId: string) => {
    const row = editedData.find((r) => r.id === rowId);
    if (!row) return;

    // Validate quantity is non-negative integer
    const quantity = Number(row.quantity_units);
    if (isNaN(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      setRowErrors((prev) => ({
        ...prev,
        [rowId]: "Quantity must be a non-negative integer.",
      }));
      return;
    }

    // Validate dates
    if (row.collection_date && row.expiry_date) {
      const colDate = new Date(row.collection_date);
      const expDate = new Date(row.expiry_date);
      if (expDate < colDate) {
        setRowErrors((prev) => ({
          ...prev,
          [rowId]: "Expiry date cannot be before collection date.",
        }));
        return;
      }
    }

    setSavingRows((prev) => ({ ...prev, [rowId]: true }));
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });

    try {
      const res = await fetch("/api/blood-inventory", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: row.id,
          quantity_units: quantity,
          collection_date: row.collection_date || null,
          expiry_date: row.expiry_date || null,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Failed to update record.");
      }

      addToast({
        variant: "success",
        message: `${row.blood_type} inventory updated successfully.`,
      });

      // Update original data states
      setOriginalData((prev) =>
        prev.map((r) => (r.id === rowId ? body : r))
      );
      setEditedData((prev) =>
        prev.map((r) => (r.id === rowId ? JSON.parse(JSON.stringify(body)) : r))
      );

    } catch (err: any) {
      console.error(err);
      setRowErrors((prev) => ({
        ...prev,
        [rowId]: err.message || "Failed to save changes.",
      }));
    } finally {
      setSavingRows((prev) => ({ ...prev, [rowId]: false }));
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
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Column gap="8">
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
                  <Icon name="blood" size="m" onBackground="danger-medium" />
                  <Heading variant="display-strong-s">Blood Bank Inventory</Heading>
                </Row>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Manage real-time blood type availability and expiry tracking
                </Text>
              </Column>
            </Row>
          </Column>
          <Text variant="label-default-s" onBackground="neutral-medium">
            {user?.email}
          </Text>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Main Content */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        {loadingData ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <Text variant="body-default-m" onBackground="neutral-weak">
              Fetching blood inventory data...
            </Text>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Blood Type</th>
                  <th>Quantity (Units)</th>
                  <th>Date of Collection</th>
                  <th>Expiry Date</th>
                  <th>Status & Actions</th>
                </tr>
              </thead>
              <tbody>
                {editedData.map((row) => {
                  const dirty = isRowDirty(row.id);
                  const saving = savingRows[row.id] || false;
                  const error = rowErrors[row.id] || "";

                  return (
                    <tr key={row.id}>
                      <td>
                        <Row gap="12" vertical="center">
                          <span className={styles.bloodBadge}>{row.blood_type}</span>
                          <Text variant="body-strong-m">{row.blood_type}</Text>
                        </Row>
                      </td>
                      <td>
                        <input
                          className={styles.inputField}
                          type="number"
                          min="0"
                          step="1"
                          value={row.quantity_units}
                          onChange={(e) =>
                            handleFieldChange(row.id, "quantity_units", e.target.value)
                          }
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.inputField}
                          type="date"
                          value={row.collection_date || ""}
                          onChange={(e) =>
                            handleFieldChange(row.id, "collection_date", e.target.value || null)
                          }
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.inputField}
                          type="date"
                          value={row.expiry_date || ""}
                          onChange={(e) =>
                            handleFieldChange(row.id, "expiry_date", e.target.value || null)
                          }
                          disabled={saving}
                        />
                      </td>
                      <td>
                        <Column gap="4">
                          <div className={styles.actionCell}>
                            {dirty && (
                              <Button
                                variant="primary"
                                size="s"
                                onClick={() => handleSave(row.id)}
                                disabled={saving}
                              >
                                {saving ? "Saving..." : "Save"}
                              </Button>
                            )}
                            {!dirty && !error && (
                              <Text variant="label-default-s" onBackground="neutral-weak">
                                Saved
                              </Text>
                            )}
                          </div>
                          {error && <Text className={styles.errorText}>{error}</Text>}
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
    </Column>
  );
}
