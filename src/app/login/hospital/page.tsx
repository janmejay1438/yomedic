"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Heading,
  Text,
  Button,
  RevealFx,
  Column,
  Row,
  Line,
} from "@once-ui-system/core";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import RequestAccessModal from "@/components/RequestAccessModal";

export default function HospitalLogin() {
  const t = useTranslations("PortalLogin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch role from Firestore before allowing redirect
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const role = userDoc.exists() ? userDoc.data()?.role : null;

      if (role !== "staff") {
        // Role mismatch — sign out immediately and block routing
        await signOut(auth);
        setError(t("adminRoleMismatch"));
        return;
      }

      // Role matches — allow redirect
      router.push("/dashboard/hospital");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Column maxWidth="m" gap="xl" paddingY="12" horizontal="center" fillWidth>
      <Column fillWidth horizontal="center" gap="m">
        <Column
          maxWidth="s"
          horizontal="center"
          align="center"
          padding="32"
          background="surface"
          style={{
            borderRadius: "20px",
            border: "1px solid var(--neutral-alpha-weak)",
            position: "relative",
            overflow: "hidden",
            width: "100%",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: "linear-gradient(90deg, #10b981, #06b6d4, #0ea5e9)",
            }}
          />

          {/* Icon */}
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="8" paddingTop="8">
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.12))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              🏥
            </div>
          </RevealFx>

          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="8">
            <Heading wrap="balance" variant="display-strong-s">
              {t("hospitalLogin")}
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.1} fillWidth horizontal="center" paddingBottom="24">
            <Text wrap="balance" onBackground="neutral-weak" variant="body-default-m" align="center">
              {t("hospitalLoginDesc")}
            </Text>
          </RevealFx>

          <RevealFx translateY="12" delay={0.2} fillWidth paddingBottom="16">
            <form
              onSubmit={handleLogin}
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {error && (
                <Text
                  variant="body-default-s"
                  onBackground="danger-medium"
                  style={{ textAlign: "center", marginBottom: "8px" }}
                >
                  {error}
                </Text>
              )}

              <Column gap="8" fillWidth>
                <Text variant="label-strong-m">{t("emailAddress")}</Text>
                <input
                  id="hospital-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@phc-east.gov"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--neutral-alpha-medium)",
                    background: "var(--neutral-alpha-weak)",
                    color: "var(--neutral-on-background-strong)",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                />
              </Column>

              <Column gap="8" fillWidth>
                <Text variant="label-strong-m">{t("password")}</Text>
                <input
                  id="hospital-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid var(--neutral-alpha-medium)",
                    background: "var(--neutral-alpha-weak)",
                    color: "var(--neutral-on-background-strong)",
                    fontSize: "16px",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                />
              </Column>

              <Row fillWidth horizontal="end" paddingBottom="8">
                <Text
                  variant="label-default-s"
                  onBackground="brand-medium"
                  style={{ cursor: "pointer" }}
                >
                  {t("forgotPassword")}
                </Text>
              </Row>

              <Button
                id="hospital-login-submit"
                type="submit"
                variant="primary"
                size="l"
                weight="strong"
                fillWidth
              >
                {loading ? t("signingIn") : t("signInDashboard")}
              </Button>
            </form>
          </RevealFx>

          {/* Divider and Request Access Section */}
          <RevealFx translateY="16" delay={0.3} fillWidth paddingTop="8">
            <Column gap="16" fillWidth horizontal="center">
              <Row fillWidth gap="12" vertical="center">
                <Line background="neutral-alpha-medium" />
                <Text
                  variant="label-default-s"
                  onBackground="neutral-medium"
                  style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  {t("newFacility")}
                </Text>
                <Line background="neutral-alpha-medium" />
              </Row>

              <Button
                id="request-access-btn"
                variant="secondary"
                size="l"
                fillWidth
                onClick={() => setShowAccessModal(true)}
              >
                {t("requestAccess")}
              </Button>

              <Text
                variant="body-default-s"
                onBackground="neutral-weak"
                align="center"
                style={{ maxWidth: "320px" }}
              >
                {t("requestAccessDesc")}
              </Text>
            </Column>
          </RevealFx>

          {/* Back to selection */}
          <RevealFx translateY="16" delay={0.4} fillWidth horizontal="center" paddingTop="16">
            <Button variant="tertiary" size="s" href="/login" prefixIcon="arrowLeft">
              {t("backToPortal")}
            </Button>
          </RevealFx>
        </Column>
      </Column>

      {/* Request Access Modal */}
      <RequestAccessModal
        isOpen={showAccessModal}
        onClose={() => setShowAccessModal(false)}
      />
    </Column>
  );
}
