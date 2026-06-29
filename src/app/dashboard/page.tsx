"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
      <Column fillWidth minHeight="100vh" vertical="center" horizontal="center">
        <Text variant="heading-default-l" onBackground="neutral-weak">Authenticating...</Text>
      </Column>
    );
  }

  return (
    <Column fillWidth minHeight="100vh" paddingX="l" paddingY="xl" gap="32" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Dashboard Header */}
      <RevealFx translateY="4" fillWidth>
        <Row horizontal="between" vertical="center" fillWidth paddingBottom="16">
          <Column gap="8">
            <Heading variant="display-strong-s">District Command Center</Heading>
            <Text variant="body-default-m" onBackground="neutral-weak">
              Real-time monitoring across all PHCs & CHCs
            </Text>
          </Column>
          <Row gap="16" vertical="center">
            <Text variant="label-default-s" onBackground="neutral-medium">
              Logged in as: {user?.email}
            </Text>
            <Button variant="secondary" size="s" onClick={handleSignOut}>
              Sign Out
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
            <Badge background="danger-medium" textVariant="label-strong-s">CRITICAL ALERT</Badge>
            <Text variant="body-strong-m" onBackground="danger-strong">
              High risk of Paracetamol stock-out at CHC North within 24 hours.
            </Text>
          </Row>
          <Button variant="primary" size="s" weight="strong">Redistribute Stock</Button>
        </Row>
      </RevealFx>

      {/* Metrics Grid */}
      <RevealFx translateY="12" delay={0.2} fillWidth>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', width: '100%' }}>
          
          {/* Stock Monitoring */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Stock Levels</Text>
              <Badge background="warning-medium" textVariant="label-strong-s">ATTENTION</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="warning-strong">68%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Average essential medicine availability</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: 'pointer' }}>View AI Forecasts →</Text>
          </Column>

          {/* Patient Footfall */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Patient Footfall</Text>
              <Badge background="success-medium" textVariant="label-strong-s">LIVE</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="success-strong">1,248</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Total patients processed today</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: 'pointer' }}>View Trend Analysis →</Text>
          </Column>

          {/* Bed Availability */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Bed Capacity</Text>
              <Badge background="danger-medium" textVariant="label-strong-s">CRITICAL</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="danger-strong">12 / 150</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Available beds across district</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: 'pointer' }}>Manage Transfers →</Text>
          </Column>

          {/* Doctor Attendance */}
          <Column padding="24" background="surface" border="neutral-alpha-weak" radius="l" gap="16">
            <Row horizontal="between" vertical="center">
              <Text variant="heading-strong-m">Staffing</Text>
              <Badge background="brand-medium" textVariant="label-strong-s">STABLE</Badge>
            </Row>
            <Column gap="8">
              <Text variant="display-strong-m" onBackground="brand-strong">85%</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">Doctor & specialist attendance</Text>
            </Column>
            <Line background="neutral-alpha-weak" />
            <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: 'pointer' }}>View Roster →</Text>
          </Column>

        </div>
      </RevealFx>

      {/* AI Recommendations Section */}
      <RevealFx translateY="16" delay={0.3} fillWidth>
        <Column padding="32" background="surface" border="neutral-alpha-weak" radius="l" gap="24">
          <Heading variant="heading-strong-l">AI Redistribution Recommendations</Heading>
          <Text variant="body-default-m" onBackground="neutral-weak">
            Based on current test availability audits and predicted demand, the following re-allocations are suggested:
          </Text>
          
          <Column gap="16">
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">Transfer 500x Dengue Rapid Test Kits</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">From: PHC East (Surplus) → To: CHC South (High Predicted Demand)</Text>
              </Column>
              <Button variant="primary" size="s">Approve Transfer</Button>
            </Row>
            
            <Row fillWidth padding="16" background="brand-alpha-weak" radius="m" vertical="center" horizontal="between">
              <Column gap="4">
                <Text variant="body-strong-m">Re-route 3 Incoming Ambulances</Text>
                <Text variant="label-default-s" onBackground="neutral-medium">From: CHC Central (0 beds) → To: CHC West (15 beds)</Text>
              </Column>
              <Button variant="primary" size="s">Execute Reroute</Button>
            </Row>
          </Column>
        </Column>
      </RevealFx>
    </Column>
  );
}
