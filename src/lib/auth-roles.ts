import type { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type PortalRole = "admin" | "hospital";

const ADMIN_ROLES = new Set(["admin", "district_admin", "district-administrator"]);
const HOSPITAL_ROLES = new Set(["hospital", "staff", "regular_staff", "regular-staff"]);

type PortalRoleOptions = {
  firestoreFallbackRole?: PortalRole;
};

function normalizeRole(role: unknown): string | null {
  return typeof role === "string" ? role.trim().toLowerCase() : null;
}

function roleFromValue(role: unknown): PortalRole | null {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return null;
  }

  if (ADMIN_ROLES.has(normalizedRole)) {
    return "admin";
  }

  if (HOSPITAL_ROLES.has(normalizedRole)) {
    return "hospital";
  }

  return null;
}

export async function getPortalRole(
  user: User,
  options: PortalRoleOptions = {}
): Promise<PortalRole> {
  const tokenResult = await user.getIdTokenResult();

  if (tokenResult.claims.isAdmin === true) {
    return "admin";
  }

  const claimRole = roleFromValue(tokenResult.claims.role);
  if (claimRole) {
    return claimRole;
  }

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const firestoreRole = roleFromValue(userDoc.data()?.role);

    return firestoreRole ?? "hospital";
  } catch (error) {
    if (options.firestoreFallbackRole) {
      console.warn("Unable to read user role from Firestore; using fallback role.", error);
      return options.firestoreFallbackRole;
    }

    throw new Error("Unable to verify account role. Please check your connection and try again.");
  }
}
