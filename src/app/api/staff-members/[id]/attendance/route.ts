import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

const ALLOWED_SHIFTS = ["Morning", "Evening", "Night"];
const ALLOWED_STATUSES = ["Present", "Absent", "Half Day", "On Leave"];

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;

    // Check staff exists
    const staff = await prisma.staffMember.findUnique({
      where: { id },
    });
    if (!staff) {
      return Response.json({ error: "Staff member not found" }, { status: 404 });
    }

    const rows = await prisma.attendanceRecord.findMany({
      where: { staffId: id },
      orderBy: { date: "desc" },
    });

    const mapped = rows.map((r) => ({
      id: r.id,
      staff_id: r.staffId,
      date: r.date,
      shift: r.shift,
      time: r.time,
      status: r.status,
    }));

    return Response.json(mapped);
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ error: err.message || "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { date, shift, time, status } = body;

    // 1. Check staff exists
    const staff = await prisma.staffMember.findUnique({
      where: { id },
    });
    if (!staff) {
      return Response.json({ error: "Staff member not found" }, { status: 404 });
    }

    // 2. Validate required fields
    if (!date || !shift || !time || !status) {
      return Response.json(
        { error: "All fields (date, shift, time, status) are required" },
        { status: 400 },
      );
    }

    if (
      typeof date !== "string" ||
      date.trim() === "" ||
      typeof shift !== "string" ||
      typeof time !== "string" ||
      typeof status !== "string"
    ) {
      return Response.json({ error: "Invalid field types" }, { status: 400 });
    }

    // 3. Validate shift
    if (!ALLOWED_SHIFTS.includes(shift)) {
      return Response.json(
        { error: `Shift must be one of: ${ALLOWED_SHIFTS.join(", ")}` },
        { status: 400 },
      );
    }

    // 4. Validate status
    if (!ALLOWED_STATUSES.includes(status)) {
      return Response.json(
        { error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    const trimmedDate = date.trim();
    const recordId = randomUUID();

    // 5. Insert or update (upsert)
    const upserted = await prisma.attendanceRecord.upsert({
      where: {
        staffId_date: {
          staffId: id,
          date: trimmedDate,
        },
      },
      update: {
        shift,
        time: time.trim(),
        status,
      },
      create: {
        id: recordId,
        staffId: id,
        date: trimmedDate,
        shift,
        time: time.trim(),
        status,
      },
    });

    return Response.json({
      id: upserted.id,
      staff_id: upserted.staffId,
      date: upserted.date,
      shift: upserted.shift,
      time: upserted.time,
      status: upserted.status,
    });
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ error: err.message || "Database error" }, { status: 500 });
  }
}
