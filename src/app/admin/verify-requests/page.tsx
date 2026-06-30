"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";
import {
  Column,
  Row,
  Text,
  Heading,
  Button,
  RevealFx,
  Line,
} from "@once-ui-system/core";
import styles from "./verify-requests.module.scss";

interface AccessRequest {
  id: string; // Supabase row UUID
  facility_name: string;
  establishment_id: string;
  contact_email: string;
  contact_phone: string;
  status: "pending" | "approved" | "rejected";
  submitted_at: string; // ISO timestamp string
  document_urls: string[];
}

type FilterStatus = "all" | "pending" | "approved" | "rejected";

export default function VerifyRequests() {
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  // Auth check
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

  // Fetch access requests from Supabase
  const fetchRequests = useCallback(async () => {
    setLoadingData(true);
    setError("");

    try {
      let query = supabase
        .from("access_requests")
        .select("*")
        .order("submitted_at", { ascending: false });

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setRequests((data as AccessRequest[]) || []);
    } catch (err: any) {
      console.error("Error fetching requests:", err);
      setError("Failed to fetch access requests. Ensure you have admin permissions.");
    } finally {
      setLoadingData(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!loadingAuth && user) {
      fetchRequests();
    }
  }, [loadingAuth, user, fetchRequests]);

  // Handle approve/reject actions via Supabase
  const handleStatusUpdate = async (
    docId: string,
    newStatus: "approved" | "rejected"
  ) => {
    setActionLoading(docId);
    try {
      const { error: updateError } = await supabase
        .from("access_requests")
        .update({ status: newStatus })
        .eq("id", docId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // Update local state to reflect the change
      setRequests((prev) =>
        prev.map((req) =>
          req.id === docId ? { ...req, status: newStatus } : req
        )
      );
    } catch (err: any) {
      console.error("Error updating status:", err);
      setError(`Failed to update request status: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Format ISO timestamp string for display
  const formatDate = (timestamp: string | null): string => {
    if (!timestamp) return "—";
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(date);
    } catch {
      return "—";
    }
  };

  // Extract readable filename from Supabase Storage public URL
  const getFileNameFromUrl = (url: string, index: number): string => {
    try {
      const urlObj = new URL(url);
      // Supabase public URL path: /storage/v1/object/public/bucket/requestId/filename
      const segments = urlObj.pathname.split("/");
      const fileName = decodeURIComponent(segments[segments.length - 1]);
      return fileName || `Document ${index + 1}`;
    } catch {
      return `Document ${index + 1}`;
    }
  };

  // Compute stats from the currently loaded data
  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    total: requests.length,
  };

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
      style={{ maxWidth: "1400px", margin: "0 auto", minHeight: "100vh" }}
    >
      {/* Page Header */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="8">
          <Column gap="8">
            <Heading variant="display-strong-s">Access Requests</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Review and manage incoming platform access requests from health facilities.
            </Text>
          </Column>
          <Row gap="12" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={() => router.push("/dashboard")}>
              ← Dashboard
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Stats Cards */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Text variant="label-default-s" onBackground="neutral-weak">
              Total Requests
            </Text>
            <Text variant="display-strong-m" onBackground="neutral-strong">
              {stats.total}
            </Text>
          </div>
          <div className={styles.statCard}>
            <Text variant="label-default-s" onBackground="warning-medium">
              Pending Review
            </Text>
            <Text variant="display-strong-m" onBackground="warning-strong">
              {stats.pending}
            </Text>
          </div>
          <div className={styles.statCard}>
            <Text variant="label-default-s" onBackground="success-medium">
              Approved
            </Text>
            <Text variant="display-strong-m" onBackground="success-strong">
              {stats.approved}
            </Text>
          </div>
          <div className={styles.statCard}>
            <Text variant="label-default-s" onBackground="danger-medium">
              Rejected
            </Text>
            <Text variant="display-strong-m" onBackground="danger-strong">
              {stats.rejected}
            </Text>
          </div>
        </div>
      </RevealFx>

      {/* Filter Tabs */}
      <RevealFx translateY="12" delay={0.15} fillWidth>
        <Row horizontal="between" vertical="center" fillWidth>
          <div className={styles.filterGroup}>
            {(["pending", "all", "approved", "rejected"] as FilterStatus[]).map(
              (f) => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${filter === f ? styles.active : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All Requests" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              )
            )}
          </div>
          <Button variant="tertiary" size="s" onClick={fetchRequests}>
            ↻ Refresh
          </Button>
        </Row>
      </RevealFx>

      {/* Error Display */}
      {error && (
        <Row
          fillWidth
          padding="16"
          background="danger-alpha-weak"
          border="danger-alpha-medium"
          radius="m"
          vertical="center"
          gap="12"
        >
          <Text variant="body-default-m" onBackground="danger-strong">
            {error}
          </Text>
          <Button variant="tertiary" size="s" onClick={() => setError("")}>
            Dismiss
          </Button>
        </Row>
      )}

      {/* Table */}
      <RevealFx translateY="16" delay={0.2} fillWidth>
        {loadingData ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <Text variant="body-default-m" onBackground="neutral-weak">
              Loading access requests...
            </Text>
          </div>
        ) : requests.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <Heading variant="heading-strong-m">No Requests Found</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {filter === "pending"
                ? "There are no pending access requests to review."
                : `No ${filter === "all" ? "" : filter} requests found.`}
            </Text>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Est. ID</th>
                  <th>Contact</th>
                  <th>Documents</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Column gap="4">
                        <Text variant="body-strong-s">{request.facility_name}</Text>
                      </Column>
                    </td>
                    <td>
                      <Text variant="label-default-s" onBackground="neutral-medium">
                        {request.establishment_id}
                      </Text>
                    </td>
                    <td>
                      <Column gap="4">
                        <Text variant="body-default-s">{request.contact_email}</Text>
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {request.contact_phone}
                        </Text>
                      </Column>
                    </td>
                    <td>
                      <div className={styles.docsCell}>
                        {request.document_urls?.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.docLink}
                          >
                            📄 {getFileNameFromUrl(url, idx)}
                          </a>
                        ))}
                      </div>
                    </td>
                    <td>
                      <Text variant="label-default-s" onBackground="neutral-medium">
                        {formatDate(request.submitted_at)}
                      </Text>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          request.status === "pending"
                            ? styles.statusPending
                            : request.status === "approved"
                            ? styles.statusApproved
                            : styles.statusRejected
                        }`}
                      >
                        <span
                          className={`${styles.statusDot} ${
                            request.status === "pending"
                              ? styles.pending
                              : request.status === "approved"
                              ? styles.approved
                              : styles.rejected
                          }`}
                        />
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {request.status === "pending" ? (
                        <div className={styles.actionGroup}>
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleStatusUpdate(request.id, "approved")}
                            disabled={actionLoading === request.id}
                          >
                            {actionLoading === request.id ? "..." : "✓ Approve"}
                          </button>
                          <button
                            className={styles.rejectBtn}
                            onClick={() => handleStatusUpdate(request.id, "rejected")}
                            disabled={actionLoading === request.id}
                          >
                            {actionLoading === request.id ? "..." : "✕ Reject"}
                          </button>
                        </div>
                      ) : (
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {request.status === "approved" ? "Approved" : "Rejected"}
                        </Text>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RevealFx>
    </Column>
  );
}
