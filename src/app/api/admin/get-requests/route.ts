import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

// ── Disable Next.js static-generation / ISR caching ──────────
// This route depends on live database state and must always run
// at request time, never at build time or from a cached response.
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/get-requests
 *
 * Secure server-side proxy that bridges Firebase Auth ↔ Supabase Data.
 *
 * Flow:
 *  1. Extract the Firebase ID token from the `Authorization: Bearer` header.
 *  2. Verify the token with Firebase Admin SDK (checks signature + expiry).
 *  3. Check custom claims for admin privileges (`role === "admin"` or `isAdmin`).
 *  4. Query Supabase via the service-role client (bypasses RLS).
 *  5. Return the filtered `access_requests` rows as JSON.
 *
 * Accepts an optional `?status=pending|approved|rejected|all` query param.
 * Defaults to `pending` if omitted.
 */
export async function GET(request: NextRequest) {
  try {
    // ── 1. Extract Bearer token ────────────────────────────────
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or malformed Authorization header." },
        { status: 401 }
      );
    }

    const idToken = authHeader.split("Bearer ")[1];

    // ── 2. Verify Firebase ID token ────────────────────────────
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (verifyError: any) {
      console.error("[get-requests] Token verification failed:", verifyError.code);
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    // ── 3. Authorization guard: require admin claim ────────────
    // Supports two common claim shapes:
    //   • { role: "admin" }  — role-based custom claim
    //   • { isAdmin: true }  — boolean flag custom claim
    const isAdmin =
      decodedToken.role === "admin" || decodedToken.isAdmin === true;

    if (!isAdmin) {
      console.warn(
        `[get-requests] Non-admin access attempt by uid=${decodedToken.uid} (${decodedToken.email})`
      );
      return NextResponse.json(
        { error: "Forbidden. Admin privileges required." },
        { status: 403 }
      );
    }

    // ── 4. Parse optional status filter ────────────────────────
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status") || "pending";
    const validStatuses = ["pending", "approved", "rejected", "all"];

    if (!validStatuses.includes(statusFilter)) {
      return NextResponse.json(
        { error: `Invalid status filter. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // ── 5. Query Supabase with service-role (bypasses RLS) ─────
    let query = supabaseAdmin
      .from("access_requests")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      console.error("[get-requests] Supabase query error:", dbError);
      return NextResponse.json(
        { error: "Failed to fetch access requests." },
        { status: 500 }
      );
    }

    // ── 6. Return data ─────────────────────────────────────────
    return NextResponse.json(
      { data, count: data?.length ?? 0 },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[get-requests] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
