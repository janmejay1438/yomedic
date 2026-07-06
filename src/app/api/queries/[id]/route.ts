import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/queries/[id]
 * Update reply (status → "In Progress") or resolve (status → "Resolved").
 * Body: { reply?: string, status?: "Resolved" }
 */
export async function PATCH(request: NextRequest, context: any) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Query ID is required." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { reply, status } = body as { reply?: string; status?: string };

    const existing = await prisma.query.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Query not found." }, { status: 404 });
    }

    // Determine new status
    let newStatus = existing.status;
    if (status === "Resolved") {
      newStatus = "Resolved";
    } else if (reply?.trim()) {
      newStatus = "In Progress";
    }

    const updated = await prisma.query.update({
      where: { id },
      data: {
        ...(reply?.trim() ? { reply: reply.trim() } : {}),
        status: newStatus,
      },
    });

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (err) {
    console.error("[api/queries/:id PATCH] error:", err);
    return NextResponse.json({ error: "Failed to update query." }, { status: 500 });
  }
}

/**
 * GET /api/queries/[id]
 * Return a single query by ID.
 */
export async function GET(_request: NextRequest, context: any) {
  try {
    const resolvedParams = await context.params;
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "Query ID is required." }, { status: 400 });
    }

    const query = await prisma.query.findUnique({ where: { id } });
    if (!query) {
      return NextResponse.json({ error: "Query not found." }, { status: 404 });
    }

    return NextResponse.json({ data: query }, { status: 200 });
  } catch (err) {
    console.error("[api/queries/:id GET] error:", err);
    return NextResponse.json({ error: "Failed to fetch query." }, { status: 500 });
  }
}
