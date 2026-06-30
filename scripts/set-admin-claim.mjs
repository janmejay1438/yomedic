/**
 * Firebase Admin: Set Custom Claims Script
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs <email>            — Grant admin
 *   node scripts/set-admin-claim.mjs <email> --revoke   — Revoke admin
 *   node scripts/set-admin-claim.mjs <email> --check    — Check claims
 *
 * This script reads credentials from .env.local automatically.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Load .env.local manually (no extra deps needed) ────────────
function loadEnvFile(filePath) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      // Strip surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local may not exist — that's okay if env vars are set elsewhere
  }
}

loadEnvFile(resolve(process.cwd(), ".env.local"));

// ── Validate args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const email = args.find((a) => !a.startsWith("--"));
const mode = args.includes("--revoke")
  ? "revoke"
  : args.includes("--check")
  ? "check"
  : "grant";

if (!email) {
  console.error("\n  Usage:");
  console.error("    node scripts/set-admin-claim.mjs <email>            — Grant admin");
  console.error("    node scripts/set-admin-claim.mjs <email> --revoke   — Revoke admin");
  console.error("    node scripts/set-admin-claim.mjs <email> --check    — Check claims\n");
  process.exit(1);
}

// ── Initialize Firebase Admin ──────────────────────────────────
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("❌ Missing Firebase Admin env vars. Check .env.local for:");
  console.error("   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});
const auth = getAuth(app);

// ── Execute ────────────────────────────────────────────────────
try {
  const user = await auth.getUserByEmail(email);
  console.log(`\n  Found user: ${user.email} (uid: ${user.uid})`);

  if (mode === "check") {
    console.log("  Current custom claims:", JSON.stringify(user.customClaims || {}, null, 2));
  } else if (mode === "revoke") {
    // Merge existing claims and remove admin fields
    const existing = user.customClaims || {};
    delete existing.role;
    delete existing.isAdmin;
    await auth.setCustomUserClaims(user.uid, existing);
    console.log("  ✅ Admin privileges REVOKED.");
    console.log("  Updated claims:", JSON.stringify(existing, null, 2));
  } else {
    // Grant: merge with existing claims
    const existing = user.customClaims || {};
    const newClaims = { ...existing, role: "admin", isAdmin: true };
    await auth.setCustomUserClaims(user.uid, newClaims);
    console.log("  ✅ Admin privileges GRANTED.");
    console.log("  Updated claims:", JSON.stringify(newClaims, null, 2));
  }

  console.log("\n  ⚠️  The user must sign out and sign back in (or force-refresh");
  console.log("     their token) for the new claims to take effect.\n");
} catch (err) {
  if (err.code === "auth/user-not-found") {
    console.error(`\n  ❌ No Firebase user found with email: ${email}\n`);
  } else {
    console.error("\n  ❌ Error:", err.message, "\n");
  }
  process.exit(1);
}
