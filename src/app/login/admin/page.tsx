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
} from "@once-ui-system/core";
import { auth, db } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function AdminLogin() {
  const t = useTranslations("PortalLogin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

      if (role !== "admin") {
        // Role mismatch — sign out immediately and block routing
        await signOut(auth);
        setError(t("hospitalRoleMismatch"));
        return;
      }

      // Role matches — allow redirect
      router.push("/dashboard");
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
              background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
            }}
          />

          {/* Icon */}
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="8" paddingTop="8">
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
              }}
            >
              🏛️
            </div>
          </RevealFx>

          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="8">
            <Heading wrap="balance" variant="display-strong-s">
              {t("adminLogin")}
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.1} fillWidth horizontal="center" paddingBottom="24">
            <Text wrap="balance" onBackground="neutral-weak" variant="body-default-m" align="center">
              {t("adminLoginDesc")}
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
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@district.gov"
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
                  id="admin-password"
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
                id="admin-login-submit"
                type="submit"
                variant="primary"
                size="l"
                weight="strong"
                fillWidth
              >
                {loading ? t("signingIn") : t("signInCommand")}
              </Button>
            </form>
          </RevealFx>

          {/* Info note */}
          <RevealFx translateY="16" delay={0.3} fillWidth paddingTop="16">
            <Row
              fillWidth
              padding="16"
              background="brand-alpha-weak"
              radius="m"
              gap="12"
              vertical="center"
            >
              <Text variant="body-default-s" onBackground="neutral-weak" align="center" style={{ width: "100%" }}>
                {t("adminProvisionedNote")}
              </Text>
            </Row>
          </RevealFx>

          {/* Back to selection */}
          <RevealFx translateY="16" delay={0.4} fillWidth horizontal="center" paddingTop="16">
            <Button variant="tertiary" size="s" href="/login" prefixIcon="arrowLeft">
              {t("backToPortal")}
            </Button>
          </RevealFx>
        </Column>
      </Column>
    </Column>
  );
}
