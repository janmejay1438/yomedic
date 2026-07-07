import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

const ALLOWED_VISIT_TYPES = ['New Registration', 'Follow-up Visit']
const ALLOWED_GENDERS = ['Male', 'Female', 'Other']

export async function GET() {
  try {
    const rows = await prisma.patient.findMany({
      include: {
        department: true
      },
      orderBy: [
        { registrationDate: 'desc' },
        { updatedAt: 'desc' }
      ]
    })
    const mapped = rows.map(p => ({
      id: p.id,
      registration_date: p.registrationDate,
      visit_type: p.visitType,
      name: p.name,
      age: p.age,
      gender: p.gender,
      department_id: p.departmentId,
      consulting_doctor: p.consultingDoctor,
      updated_at: p.updatedAt,
      department_name: p.department.name
    }))
    return Response.json(mapped)
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { registration_date, visit_type, name, age, gender, department_id, consulting_doctor } = body

    // 1. All 7 fields required
    if (
      !registration_date ||
      !visit_type ||
      !name ||
      age === undefined ||
      !gender ||
      !department_id ||
      !consulting_doctor
    ) {
      return Response.json({ error: 'All 7 fields are required' }, { status: 400 })
    }

    // 2. Validate age is a positive integer
    const parsedAge = Number(age)
    if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
      return Response.json({ error: 'Age must be a positive integer' }, { status: 400 })
    }

    // 3. Validate visit_type
    if (!ALLOWED_VISIT_TYPES.includes(visit_type)) {
      return Response.json(
        { error: `visit_type must be one of: ${ALLOWED_VISIT_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. Validate gender
    if (!ALLOWED_GENDERS.includes(gender)) {
      return Response.json(
        { error: `gender must be one of: ${ALLOWED_GENDERS.join(', ')}` },
        { status: 400 }
      )
    }

    // 5. Validate department_id exists
    const dept = await prisma.department.findUnique({
      where: { id: department_id }
    })
    if (!dept) {
      return Response.json({ error: 'department_id does not exist' }, { status: 400 })
    }

    // 6. Validate non-empty strings for name, consulting_doctor, registration_date
    if (
      typeof name !== 'string' || name.trim() === '' ||
      typeof consulting_doctor !== 'string' || consulting_doctor.trim() === '' ||
      typeof registration_date !== 'string' || registration_date.trim() === ''
    ) {
      return Response.json({ error: 'Text fields cannot be empty' }, { status: 400 })
    }

    const id = randomUUID()
    const created = await prisma.patient.create({
      data: {
        id,
        registrationDate: registration_date.trim(),
        visitType: visit_type,
        name: name.trim(),
        age: parsedAge,
        gender,
        departmentId: department_id,
        consultingDoctor: consulting_doctor.trim(),
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      },
      include: {
        department: true
      }
    })

    return Response.json({
      id: created.id,
      registration_date: created.registrationDate,
      visit_type: created.visitType,
      name: created.name,
      age: created.age,
      gender: created.gender,
      department_id: created.departmentId,
      consulting_doctor: created.consultingDoctor,
      updated_at: created.updatedAt,
      department_name: created.department.name
    }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}
