"use client";

import {
  Heading,
  Text,
  Button,
  RevealFx,
  Column,
  Row,
  Line,
  Badge,
} from "@once-ui-system/core";

export default function LoginSelector() {
  return (
    <Column maxWidth="l" gap="xl" paddingY="12" horizontal="center" fillWidth>
      <Column fillWidth horizontal="center" gap="m">
        <Column maxWidth="m" horizontal="center" align="center">
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="8">
            <Heading wrap="balance" variant="display-strong-s" align="center">
              Choose Your Portal
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.1} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="body-default-l" align="center">
              Select the appropriate login portal to access the Yomedic platform.
            </Text>
          </RevealFx>
        </Column>
      </Column>

      {/* Two Portal Cards */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            width: "100%",
            maxWidth: "780px",
            margin: "0 auto",
          }}
        >
          {/* Hospital Login Card */}
          <Column
            padding="32"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="20"
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(90deg, #10b981, #06b6d4)",
              }}
            />
            <Row gap="16" vertical="center" paddingTop="4">
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
                🏥
              </div>
              <Column gap="2">
                <Heading variant="heading-strong-m">Hospital Login</Heading>
                <Text variant="label-default-s" onBackground="neutral-medium">PHC / CHC Staff</Text>
              </Column>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Access your facility&apos;s management dashboard to track stocks, patients, beds, and staff.
            </Text>
            <Button
              id="login-hospital-btn"
              variant="primary"
              size="l"
              fillWidth
              arrowIcon
              href="/login/hospital"
            >
              Hospital Sign In
            </Button>
          </Column>

          {/* Admin Login Card */}
          <Column
            padding="32"
            background="surface"
            border="neutral-alpha-weak"
            radius="l"
            gap="20"
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
            <Row gap="16" vertical="center" paddingTop="4">
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                }}
              >
                🏛️
              </div>
              <Column gap="2">
                <Heading variant="heading-strong-m">Administrator Login</Heading>
                <Text variant="label-default-s" onBackground="neutral-medium">District Officials</Text>
              </Column>
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Monitor all health centres across the district, review join requests, and manage resources.
            </Text>
            <Button
              id="login-admin-btn"
              variant="primary"
              size="l"
              fillWidth
              arrowIcon
              href="/login/admin"
            >
              Admin Sign In
            </Button>
          </Column>
        </div>
      </RevealFx>

      {/* Back Link */}
      <RevealFx translateY="16" delay={0.3} fillWidth horizontal="center">
        <Button variant="tertiary" size="s" href="/" prefixIcon="arrowLeft">
          Back to Home
        </Button>
      </RevealFx>
    </Column>
  );
}
