"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
  Flex
} from "@once-ui-system/core";

export default function Dashboard() {
  const t = useTranslations("DistrictDashboard");
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setLoadingAuth(false);
      } else {
        // Redirect to login if not authenticated
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loadingAuth) {
    return (
      <Column fillWidth style={{ minHeight: '100vh' }} vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
      </Column>
    );
  }

  return (
    <Column fillWidth paddingX="l" paddingY="xl" gap="32" style={{ maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      
      {/* Dashboard Header */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Column gap="8">
            <Heading variant="display-strong-s">{t("title")}</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              {t("subtitle")}
            </Text>
          </Column>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              {t("loggedInAs")} {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              {t("signOut")}
            </Button>
          </Row>
        </Row>
        <Line background="neutral-alpha-medium" />
      </RevealFx>

      {/* Critical Alerts Banner */}
      <RevealFx translateY="8" delay={0.1} fillWidth>
        <Row 
          fillWidth 
          padding="16" 
          background="danger-alpha-weak" 
          border="danger-alpha-medium" 
          radius="m" 
          vertical="center" 
          horizontal="between"
        >
          <Row gap="12" vertical="center">
            <Badge background="danger-medium" textVariant="label-strong-s">{t("criticalAlert")}</Badge>
            <Text variant="body-strong-m" onBackground="danger-strong">
              {t("alertText")}
            </Text>
          </Row>
          <Button variant="primary" size="s" weight="strong">{t("redistributeStock")}</Button>
        </Row>
      </RevealFx>

      {/* Metrics Grid */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
          
          {/* Stock Monitoring */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">{t("stockLevels")}</Text>
              <Badge background="warning-medium" textVariant="label-strong-s">{t("stockAttention")}</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="warning-strong">68%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("stockDesc")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>{t("viewForecasts")}</Text>
          </Column>

          {/* Patient Footfall */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">{t("patientFootfall")}</Text>
              <Badge background="success-medium" textVariant="label-strong-s">{t("live")}</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="success-strong">1,248</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("patientsDesc")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>{t("viewTrends")}</Text>
          </Column>

          {/* Bed Availability */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">{t("bedCapacity")}</Text>
              <Badge background="danger-medium" textVariant="label-strong-s">{t("critical")}</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="danger-strong">12 / 150</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("bedsDesc")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>{t("manageTransfers")}</Text>
          </Column>

          {/* Doctor Attendance */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">{t("staffing")}</Text>
              <Badge background="brand-medium" textVariant="label-strong-s">{t("stable")}</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="brand-strong">85%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">{t("staffingDesc")}</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: "pointer" }}>{t("viewRoster")}</Text>
          </Column>

        </div>
      </RevealFx>

      {/* AI Recommendations Section */}
      <RevealFx translateY="16" delay={0.3} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="24">
          <Heading variant="heading-strong-l">{t("aiRecommendations")}</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            {t("aiRecommendationDesc")}
          </Text>
          
          <Column gap="16">
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">{t("transferDengue")}</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">{t("transferDengueDesc")}</Text>
              </Column>
              <Button variant="primary" size="s">{t("approveTransfer")}</Button>
            </Row>
            
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">{t("rerouteAmbulances")}</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">{t("rerouteAmbulancesDesc")}</Text>
              </Column>
              <Button variant="primary" size="s">{t("executeReroute")}</Button>
            </Row>
          </Column>
        </Column>
      </RevealFx>
    </Column>
  );
}
