import {
  Heading,
  Text,
  Button,
  RevealFx,
  Column,
  Badge,
  Row,
  Schema,
  Meta,
  Line,
} from "@once-ui-system/core";
import { home, person, baseURL } from "@/resources";

export async function generateMetadata() {
  return Meta.generate({
    title: home.title,
    description: home.description,
    baseURL: baseURL,
    path: home.path,
    image: home.image,
  });
}

export default function Home() {
  return (
    <Column maxWidth="l" gap="xl" paddingY="12" horizontal="center" fillWidth>
      <Schema
        as="webPage"
        baseURL={baseURL}
        path={home.path}
        title={home.title}
        description={home.description}
        image={`/api/og/generate?title=${encodeURIComponent(home.title)}`}
        author={{
          name: person.name,
          url: `${baseURL}/`,
          image: `${baseURL}${person.avatar}`,
        }}
      />

      {/* Hero Section */}
      <Column fillWidth horizontal="center" gap="m">
        <Column maxWidth="m" horizontal="center" align="center">
          {home.featured.display && (
            <RevealFx
              fillWidth
              horizontal="center"
              paddingTop="16"
              paddingBottom="32"
              paddingLeft="12"
            >
              <Badge
                background="brand-alpha-weak"
                paddingX="12"
                paddingY="4"
                onBackground="neutral-strong"
                textVariant="label-default-s"
                arrow={false}
              >
                <Row paddingY="2" gap="8" vertical="center">
                  <span style={{ fontSize: "10px" }}>🏥</span>
                  <strong>Yomedic</strong>
                  <Line background="brand-alpha-strong" vert height="16" />
                  <Text onBackground="brand-medium" style={{ fontSize: "12px" }}>
                    District Health Management
                  </Text>
                </Row>
              </Badge>
            </RevealFx>
          )}
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-l" align="center">
              {home.headline}
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.2} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="heading-default-xl" align="center">
              {home.subline}
            </Text>
          </RevealFx>
        </Column>
      </Column>

      {/* Dual Portal Cards */}
      <RevealFx translateY="12" delay={0.3} fillWidth>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "32px",
            width: "100%",
            maxWidth: "900px",
            margin: "0 auto",
          }}
        >
          {/* Hospital Management Portal Card */}
          <a
            href="/login/hospital"
            id="portal-hospital"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <Column
              padding="32"
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
              gap="20"
              style={{
                position: "relative",
                overflow: "hidden",
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                cursor: "pointer",
                minHeight: "320px",
              }}
            >
              {/* Accent gradient stripe */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #10b981, #06b6d4, #0ea5e9)",
                  borderRadius: "12px 12px 0 0",
                }}
              />

              <Row horizontal="between" vertical="center" paddingTop="8">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                  }}
                >
                  🏥
                </div>
                <Badge
                  background="success-alpha-medium"
                  textVariant="label-strong-s"
                  paddingX="12"
                  paddingY="4"
                >
                  PHC / CHC
                </Badge>
              </Row>

              <Column gap="8">
                <Heading variant="heading-strong-l">Hospital Management</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Manage your PHC/CHC inventory, patient records, staff attendance, and bed availability. Submit daily reports to the district.
                </Text>
              </Column>

              <Line background="neutral-alpha-weak" />

              <Column gap="8">
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ Stock & inventory management</Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ Patient footfall tracking</Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ Join district dashboard</Text>
                </Row>
              </Column>

              <Row fillWidth horizontal="end" paddingTop="8">
                <Button
                  variant="secondary"
                  size="m"
                  arrowIcon
                >
                  Access Portal
                </Button>
              </Row>
            </Column>
          </a>

          {/* District Administrator Portal Card */}
          <a
            href="/login/admin"
            id="portal-admin"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <Column
              padding="32"
              background="surface"
              border="neutral-alpha-weak"
              radius="l"
              gap="20"
              style={{
                position: "relative",
                overflow: "hidden",
                transition: "all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                cursor: "pointer",
                minHeight: "320px",
              }}
            >
              {/* Accent gradient stripe */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7)",
                  borderRadius: "12px 12px 0 0",
                }}
              />

              <Row horizontal="between" vertical="center" paddingTop="8">
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "28px",
                  }}
                >
                  🏛️
                </div>
                <Badge
                  background="brand-alpha-medium"
                  textVariant="label-strong-s"
                  paddingX="12"
                  paddingY="4"
                >
                  DISTRICT
                </Badge>
              </Row>

              <Column gap="8">
                <Heading variant="heading-strong-l">District Administrator</Heading>
                <Text variant="body-default-m" onBackground="neutral-weak">
                  Monitor all PHCs & CHCs across the district. Review join requests, view AI-driven forecasts, and manage resource redistribution.
                </Text>
              </Column>

              <Line background="neutral-alpha-weak" />

              <Column gap="8">
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ Multi-facility monitoring</Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ AI demand forecasts & alerts</Text>
                </Row>
                <Row gap="8" vertical="center">
                  <Text variant="label-default-s" onBackground="neutral-medium">✦ Resource redistribution</Text>
                </Row>
              </Column>

              <Row fillWidth horizontal="end" paddingTop="8">
                <Button
                  variant="secondary"
                  size="m"
                  arrowIcon
                >
                  Access Portal
                </Button>
              </Row>
            </Column>
          </a>
        </div>
      </RevealFx>

      {/* Bottom Tagline */}
      <RevealFx translateY="16" delay={0.5} fillWidth horizontal="center">
        <Text variant="body-default-s" onBackground="neutral-weak" align="center" style={{ maxWidth: "480px" }}>
          Multilingual AI platform powering real-time health centre management across India&apos;s public health infrastructure.
        </Text>
      </RevealFx>
    </Column>
  );
}
