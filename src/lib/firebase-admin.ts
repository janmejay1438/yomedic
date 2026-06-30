import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

/**
 * Lazily initializes the Firebase Admin SDK as a singleton.
 *
 * Why a function instead of a top-level `initializeApp()`?
 * - Next.js API routes can be cold-started multiple times in dev (HMR) and in
 *   serverless environments. `getApps()` guards against duplicate instances.
 * - All credentials are read from server-only env vars (no NEXT_PUBLIC_ prefix),
 *   so they are never exposed to the client bundle.
 */
function getFirebaseAdminApp(): App {
  const existing = getApps();

  if (existing.length > 0) {
    return existing[0];
  }

  // ── Validate required env vars ──────────────────────────────
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[firebase-admin] Missing one or more required environment variables: " +
        "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY. " +
        "Ensure they are set in .env.local (server-only, no NEXT_PUBLIC_ prefix)."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // The private key is stored as a single-line string with literal `\n`
      // escape sequences. We must convert them to actual newline characters
      // so that the PEM parser can read the key correctly.
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

// ── Exports ─────────────────────────────────────────────────────
const adminApp = getFirebaseAdminApp();
const adminAuth: Auth = getAuth(adminApp);

export { adminApp, adminAuth };
