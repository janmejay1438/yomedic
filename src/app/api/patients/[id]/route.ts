import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_VISIT_TYPES = ['New Registration', 'Follow-up Visit']
const ALLOWED_GENDERS = ['Male', 'Female', 'Other']

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await request.json()

    // Find the existing patient first
    const patient = await prisma.patient.findUnique({
      where: { id }
    })
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Build fields to update
    const prismaUpdateData: Record<string, any> = {}

    if (body.registration_date !== undefined) {
      if (typeof body.registration_date !== 'string' || body.registration_date.trim() === '') {
        return Response.json({ error: 'registration_date must be a non-empty string' }, { status: 400 })
      }
      prismaUpdateData.registrationDate = body.registration_date.trim()
    }

    if (body.visit_type !== undefined) {
      if (!ALLOWED_VISIT_TYPES.includes(body.visit_type)) {
        return Response.json({ error: `visit_type must be one of: ${ALLOWED_VISIT_TYPES.join(', ')}` }, { status: 400 })
      }
      prismaUpdateData.visitType = body.visit_type
    }

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim() === '') {
        return Response.json({ error: 'name must be a non-empty string' }, { status: 400 })
      }
      prismaUpdateData.name = body.name.trim()
    }

    if (body.age !== undefined) {
      const parsedAge = Number(body.age)
      if (!Number.isInteger(parsedAge) || parsedAge <= 0) {
        return Response.json({ error: 'Age must be a positive integer' }, { status: 400 })
      }
      prismaUpdateData.age = parsedAge
    }

    if (body.gender !== undefined) {
      if (!ALLOWED_GENDERS.includes(body.gender)) {
        return Response.json({ error: `gender must be one of: ${ALLOWED_GENDERS.join(', ')}` }, { status: 400 })
      }
      prismaUpdateData.gender = body.gender
    }

    if (body.department_id !== undefined) {
      const dept = await prisma.department.findUnique({
        where: { id: body.department_id }
      })
      if (!dept) {
        return Response.json({ error: 'department_id does not exist' }, { status: 400 })
      }
      prismaUpdateData.departmentId = body.department_id
    }

    if (body.consulting_doctor !== undefined) {
      if (typeof body.consulting_doctor !== 'string' || body.consulting_doctor.trim() === '') {
        return Response.json({ error: 'consulting_doctor must be a non-empty string' }, { status: 400 })
      }
      prismaUpdateData.consultingDoctor = body.consulting_doctor.trim()
    }

    if (Object.keys(prismaUpdateData).length === 0) {
      return Response.json({ error: 'No fields to update provided' }, { status: 400 })
    }

    // Add updated_at
    prismaUpdateData.updatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19)

    const updated = await prisma.patient.update({
      where: { id },
      data: prismaUpdateData,
      include: {
        department: true
      }
    })

    return Response.json({
      id: updated.id,
      registration_date: updated.registrationDate,
      visit_type: updated.visitType,
      name: updated.name,
      age: updated.age,
      gender: updated.gender,
      department_id: updated.departmentId,
      consulting_doctor: updated.consultingDoctor,
      updated_at: updated.updatedAt,
      department_name: updated.department.name
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const patient = await prisma.patient.findUnique({
      where: { id }
    })
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 })
    }

    await prisma.patient.delete({
      where: { id }
    })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}
