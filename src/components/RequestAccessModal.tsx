"use client";

import { useState, useRef, useCallback } from "react";
import {
  Heading,
  Text,
  Button,
  Column,
  Row,
  RevealFx,
  Line,
} from "@once-ui-system/core";
import { supabase } from "@/lib/supabase";
import styles from "./RequestAccessModal.module.scss";

interface RequestAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  facilityName: string;
  establishmentId: string;
  contactEmail: string;
  contactPhone: string;
}

type SubmissionStage = "idle" | "uploading" | "saving" | "success" | "error";

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function RequestAccessModal({
  isOpen,
  onClose,
}: RequestAccessModalProps) {
  const [formData, setFormData] = useState<FormData>({
    facilityName: "",
    establishmentId: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<SubmissionStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setFormData({
      facilityName: "",
      establishmentId: "",
      contactEmail: "",
      contactPhone: "",
    });
    setFiles([]);
    setStage("idle");
    setUploadProgress(0);
    setErrorMessage("");
    setDragActive(false);
  }, []);

  const handleClose = useCallback(() => {
    if (stage === "uploading" || stage === "saving") return; // Prevent closing during submission
    resetForm();
    onClose();
  }, [stage, resetForm, onClose]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateFiles = (newFiles: File[]): { valid: File[]; errors: string[] } => {
    const errors: string[] = [];
    const valid: File[] = [];

    for (const file of newFiles) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        errors.push(`"${file.name}" — unsupported file type. Use PDF, JPEG, PNG, WEBP, or DOC.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        errors.push(`"${file.name}" — exceeds ${MAX_FILE_SIZE_MB}MB limit.`);
        continue;
      }
      valid.push(file);
    }

    return { valid, errors };
  };

  const addFiles = (newFiles: File[]) => {
    const { valid, errors } = validateFiles(newFiles);

    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
      setTimeout(() => setErrorMessage(""), 5000);
    }

    const totalAllowed = MAX_FILES - files.length;
    const toAdd = valid.slice(0, totalAllowed);

    if (valid.length > totalAllowed) {
      setErrorMessage(`Maximum ${MAX_FILES} files allowed. Only ${totalAllowed} more can be added.`);
      setTimeout(() => setErrorMessage(""), 5000);
    }

    if (toAdd.length > 0) {
      setFiles((prev) => [...prev, ...toAdd]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
      // Reset the input so the same file can be re-selected if removed
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const uploadFileToSupabase = async (
    file: File,
    requestId: string
  ): Promise<string> => {
    const filePath = `${requestId}/${file.name}`;

    const { error } = await supabase.storage
      .from("verification-docs")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("verification-docs")
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Validate required fields
    if (!formData.facilityName.trim()) {
      setErrorMessage("Facility name is required.");
      return;
    }
    if (!formData.establishmentId.trim()) {
      setErrorMessage("Establishment ID is required.");
      return;
    }
    if (!formData.contactEmail.trim()) {
      setErrorMessage("Contact email is required.");
      return;
    }
    if (!formData.contactPhone.trim()) {
      setErrorMessage("Contact phone is required.");
      return;
    }
    if (files.length === 0) {
      setErrorMessage("At least one verification document is required.");
      return;
    }

    try {
      // STEP 1: Generate a unique request ID for storage paths
      const tempRequestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // STEP 2: Upload files to Supabase Storage
      setStage("uploading");
      setUploadProgress(0);

      const totalFiles = files.length;
      let completedFiles = 0;

      const documentUrls: string[] = [];

      for (const file of files) {
        const url = await uploadFileToSupabase(file, tempRequestId);
        documentUrls.push(url);
        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));
      }

      setUploadProgress(100);

      // STEP 3: Insert record into Supabase access_requests table
      setStage("saving");

      const { error: insertError } = await supabase
        .from("access_requests")
        .insert({
          facility_name: formData.facilityName.trim(),
          establishment_id: formData.establishmentId.trim(),
          contact_email: formData.contactEmail.trim(),
          contact_phone: formData.contactPhone.trim(),
          status: "pending",
          document_urls: documentUrls,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      // STEP 4: Success!
      setStage("success");
    } catch (error: any) {
      console.error("Submission error:", error);
      setStage("error");
      setErrorMessage(
        error?.message || "An unexpected error occurred. Please try again."
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Close modal"
          disabled={stage === "uploading" || stage === "saving"}
        >
          ✕
        </button>

        {stage === "success" ? (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <Heading variant="heading-strong-l">Request Submitted</Heading>
            <Text
              variant="body-default-m"
              onBackground="neutral-weak"
              align="center"
            >
              Your access request has been submitted successfully. Our verification
              team will review your documents and get back to you at{" "}
              <strong>{formData.contactEmail}</strong>.
            </Text>
            <Text
              variant="label-default-s"
              onBackground="neutral-medium"
              align="center"
            >
              Request ID: {formData.establishmentId}
            </Text>
            <Button
              variant="primary"
              size="m"
              onClick={handleClose}
              style={{ marginTop: "8px" }}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <Column gap="4" paddingBottom="24">
              <Heading variant="heading-strong-l">Request Platform Access</Heading>
              <Text variant="body-default-m" onBackground="neutral-weak">
                Submit your Public Health Center details and verification
                documents to request access to the Yomedic platform.
              </Text>
            </Column>

            <Line background="neutral-alpha-weak" />

            <form onSubmit={handleSubmit} style={{ width: "100%" }}>
              <Column gap="24" paddingTop="24">
                {/* Facility Name */}
                <div className={styles.formField}>
                  <Text variant="label-strong-s">
                    Facility Name <span style={{ color: "var(--danger-on-background-medium)" }}>*</span>
                  </Text>
                  <input
                    className={styles.input}
                    type="text"
                    name="facilityName"
                    value={formData.facilityName}
                    onChange={handleInputChange}
                    placeholder="e.g. City General Public Health Center"
                    required
                    disabled={stage === "uploading" || stage === "saving"}
                  />
                </div>

                {/* Establishment ID */}
                <div className={styles.formField}>
                  <Text variant="label-strong-s">
                    Establishment ID <span style={{ color: "var(--danger-on-background-medium)" }}>*</span>
                  </Text>
                  <input
                    className={styles.input}
                    type="text"
                    name="establishmentId"
                    value={formData.establishmentId}
                    onChange={handleInputChange}
                    placeholder="e.g. PHC-987654"
                    required
                    disabled={stage === "uploading" || stage === "saving"}
                  />
                </div>

                {/* Contact Email */}
                <div className={styles.formField}>
                  <Text variant="label-strong-s">
                    Contact Email <span style={{ color: "var(--danger-on-background-medium)" }}>*</span>
                  </Text>
                  <input
                    className={styles.input}
                    type="email"
                    name="contactEmail"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="e.g. admin@cityphc.gov"
                    required
                    disabled={stage === "uploading" || stage === "saving"}
                  />
                </div>

                {/* Contact Phone */}
                <div className={styles.formField}>
                  <Text variant="label-strong-s">
                    Contact Phone <span style={{ color: "var(--danger-on-background-medium)" }}>*</span>
                  </Text>
                  <input
                    className={styles.input}
                    type="tel"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="e.g. +1234567890"
                    required
                    disabled={stage === "uploading" || stage === "saving"}
                  />
                </div>

                <Line background="neutral-alpha-weak" />

                {/* File Upload */}
                <div className={styles.formField}>
                  <Text variant="label-strong-s">
                    Verification Documents <span style={{ color: "var(--danger-on-background-medium)" }}>*</span>
                  </Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Upload establishment proof, license, registration certificates, or other official documents.
                    (PDF, JPEG, PNG, WEBP, DOC — max {MAX_FILE_SIZE_MB}MB each, up to {MAX_FILES} files)
                  </Text>

                  <div
                    className={`${styles.fileUploadArea} ${dragActive ? styles.dragActive : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      className={styles.fileInput}
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={handleFileChange}
                      disabled={stage === "uploading" || stage === "saving" || files.length >= MAX_FILES}
                    />
                    <span className={styles.uploadIcon}>📄</span>
                    <Text variant="label-default-s" onBackground="neutral-medium">
                      {files.length >= MAX_FILES
                        ? "Maximum files reached"
                        : "Drag & drop files here or click to browse"}
                    </Text>
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className={styles.fileList}>
                      {files.map((file, index) => (
                        <div key={`${file.name}-${index}`} className={styles.fileItem}>
                          <div className={styles.fileItemInfo}>
                            <span className={styles.fileIcon}>
                              {file.type.includes("pdf") ? "📕" : file.type.includes("image") ? "🖼️" : "📄"}
                            </span>
                            <span className={styles.fileName}>{file.name}</span>
                          </div>
                          <span className={styles.fileSize}>
                            {formatFileSize(file.size)}
                          </span>
                          <button
                            type="button"
                            className={styles.removeFileBtn}
                            onClick={() => removeFile(index)}
                            disabled={stage === "uploading" || stage === "saving"}
                            aria-label={`Remove ${file.name}`}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className={styles.errorBox}>
                    <Text variant="body-default-s" onBackground="danger-medium">
                      {errorMessage}
                    </Text>
                  </div>
                )}

                {/* Progress Bar */}
                {(stage === "uploading" || stage === "saving") && (
                  <Column gap="8">
                    <div className={styles.progressBarContainer}>
                      <div
                        className={styles.progressBar}
                        style={{ width: `${stage === "saving" ? 100 : uploadProgress}%` }}
                      />
                    </div>
                    <Text variant="label-default-s" onBackground="neutral-medium" align="center">
                      {stage === "uploading"
                        ? `Uploading documents... ${uploadProgress}%`
                        : "Saving your request..."}
                    </Text>
                  </Column>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="l"
                  weight="strong"
                  fillWidth
                  disabled={stage === "uploading" || stage === "saving"}
                >
                  {stage === "uploading"
                    ? "Uploading Documents..."
                    : stage === "saving"
                    ? "Saving Request..."
                    : stage === "error"
                    ? "Retry Submission"
                    : "Submit Access Request"}
                </Button>
              </Column>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
