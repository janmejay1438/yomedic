import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function GET() {
  try {
    const rows = await prisma.staffSection.findMany({
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
      return Response.json({ error: 'Section name is required' }, { status: 400 })
    }

    const trimmedName = name.trim()

    // Check uniqueness
    const existing = await prisma.staffSection.findUnique({
      where: { name: trimmedName }
    })
    if (existing) {
      return Response.json({ error: 'Section name already exists' }, { status: 400 })
    }

    const id = 'sec-' + randomUUID().substring(0, 8)
    const created = await prisma.staffSection.create({
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
