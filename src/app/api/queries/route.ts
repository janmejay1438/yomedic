import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/queries
 * Save a new hospital query to SQLite.
 * Body: { hospitalId, hospitalName, subject, message, priority }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { hospitalId, hospitalName, subject, message, priority } = body as {
      hospitalId?: string;
      hospitalName?: string;
      subject?: string;
      message?: string;
      priority?: string;
    };

    if (!hospitalId || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: "hospitalId, subject and message are required." },
        { status: 400 },
      );
    }

    const VALID_PRIORITIES = ["Low", "Medium", "High", "Emergency"];
    const finalPriority = VALID_PRIORITIES.includes(priority ?? "") ? priority! : "Medium";

    const query = await prisma.query.create({
      data: {
        hospitalId,
        hospitalName: hospitalName?.trim() || hospitalId,
        subject: subject.trim(),
        message: message.trim(),
        priority: finalPriority,
        status: "Pending",
      },
    });

    return NextResponse.json({ data: query }, { status: 201 });
  } catch (err) {
    console.error("[api/queries POST] error:", err);
    return NextResponse.json({ error: "Failed to submit query." }, { status: 500 });
  }
}

/**
 * GET /api/queries
 * - With ?hospitalId=xxx  → returns only that hospital's queries
 * - Without query param    → returns ALL queries (for District Admin)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hospitalId = searchParams.get("hospitalId");

    const queries = await prisma.query.findMany({
      where: hospitalId ? { hospitalId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: queries }, { status: 200 });
  } catch (err) {
    console.error("[api/queries GET] error:", err);
    return NextResponse.json({ error: "Failed to fetch queries." }, { status: 500 });
  }
}
