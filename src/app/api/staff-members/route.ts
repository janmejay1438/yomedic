import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

const ALLOWED_SHIFTS = ["Morning", "Evening", "Night"];

export async function GET() {
  try {
    const rows = await prisma.staffMember.findMany({
      include: {
        section: true,
        department: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    const mapped = rows.map((m) => ({
      id: m.id,
      name: m.name,
      section_id: m.sectionId,
      department_id: m.departmentId,
      shift: m.shift,
      section_name: m.section.name,
      department_name: m.department.name,
    }));
    return Response.json(mapped);
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ error: err.message || "Database error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, section_id, department_id, shift } = body;

    if (!name || !section_id || !department_id || !shift) {
      return Response.json({ error: "All fields are required" }, { status: 400 });
    }

    if (
      typeof name !== "string" ||
      name.trim() === "" ||
      typeof section_id !== "string" ||
      typeof department_id !== "string" ||
      typeof shift !== "string"
    ) {
      return Response.json({ error: "Invalid field types" }, { status: 400 });
    }

    // Validate shift
    if (!ALLOWED_SHIFTS.includes(shift)) {
      return Response.json(
        { error: `Shift must be one of: ${ALLOWED_SHIFTS.join(", ")}` },
        { status: 400 },
      );
    }

    // Validate section_id exists
    const sec = await prisma.staffSection.findUnique({
      where: { id: section_id },
    });
    if (!sec) {
      return Response.json({ error: "Selected section does not exist" }, { status: 400 });
    }

    // Validate department_id exists
    const dept = await prisma.staffDepartment.findUnique({
      where: { id: department_id },
    });
    if (!dept) {
      return Response.json({ error: "Selected department does not exist" }, { status: 400 });
    }

    const id = `staff-${randomUUID().substring(0, 8)}`;
    const created = await prisma.staffMember.create({
      data: {
        id,
        name: name.trim(),
        sectionId: section_id,
        departmentId: department_id,
        shift,
      },
      include: {
        section: true,
        department: true,
      },
    });

    return Response.json(
      {
        id: created.id,
        name: created.name,
        section_id: created.sectionId,
        department_id: created.departmentId,
        shift: created.shift,
        section_name: created.section.name,
        department_name: created.department.name,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const err = error as { message?: string };
    return Response.json({ error: err.message || "Database error" }, { status: 500 });
  }
}
