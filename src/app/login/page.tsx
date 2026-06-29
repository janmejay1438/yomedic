"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Heading,
  Text,
  Button,
  RevealFx,
  Column,
  Row,
} from "@once-ui-system/core";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export default function Login() {
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
      await signInWithEmailAndPassword(auth, email, password);
      // On success, redirect to the dashboard
      router.push("/dashboard"); // Assuming you will build a dashboard
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Column maxWidth="m" gap="xl" paddingY="12" horizontal="center" fillWidth>
      <Column fillWidth horizontal="center" gap="m">
        <Column maxWidth="s" horizontal="center" align="center" padding="24" background="surface" style={{ borderRadius: '16px', border: '1px solid var(--neutral-alpha-weak)', width: '100%' }}>
          <RevealFx translateY="4" fillWidth horizontal="center" paddingBottom="16">
            <Heading wrap="balance" variant="display-strong-s">
              Administrator Login
            </Heading>
          </RevealFx>
          <RevealFx translateY="8" delay={0.1} fillWidth horizontal="center" paddingBottom="32">
            <Text wrap="balance" onBackground="neutral-weak" variant="body-default-m" align="center">
              Access the Yomedic AI platform for real-time district health centre management.
            </Text>
          </RevealFx>
          
          <RevealFx translateY="12" delay={0.2} fillWidth paddingBottom="16">
            <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {error && (
                <Text variant="body-default-s" onBackground="danger-medium" style={{ textAlign: 'center', marginBottom: '8px' }}>
                  {error}
                </Text>
              )}
              <Column gap="8" fillWidth>
                <Text variant="label-strong-m">Email Address</Text>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@district.gov" 
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-alpha-medium)',
                    background: 'var(--neutral-alpha-weak)',
                    color: 'var(--neutral-on-background-strong)',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </Column>
              <Column gap="8" fillWidth>
                <Text variant="label-strong-m">Password</Text>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--neutral-alpha-medium)',
                    background: 'var(--neutral-alpha-weak)',
                    color: 'var(--neutral-on-background-strong)',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </Column>
              
              <Row fillWidth horizontal="end" paddingBottom="16">
                <Text variant="label-default-s" onBackground="brand-medium" style={{ cursor: 'pointer' }}>
                  Forgot Password?
                </Text>
              </Row>

              <Button
                type="submit"
                variant="primary"
                size="l"
                weight="strong"
                fillWidth
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </RevealFx>
        </Column>
      </Column>
    </Column>
  );
}
