import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const rows = await prisma.department.findMany({
      orderBy: {
        name: 'asc'
      }
    })
    return Response.json(rows)
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return Response.json({ error: 'Department name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check if name is unique
    const existing = await prisma.department.findUnique({
      where: { name: trimmedName }
    })
    if (existing) {
      return Response.json({ error: 'Department name already exists' }, { status: 400 })
    }

    const id = 'dept-' + randomUUID().substring(0, 8)
    const created = await prisma.department.create({
      data: {
        id,
        name: trimmedName
      }
    })

    return Response.json(created, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}
