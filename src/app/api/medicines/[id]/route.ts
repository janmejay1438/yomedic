import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await request.json()
    const { arrival_date, stock_arrived, stock_left, expiry_date } = body

    if (!arrival_date || !expiry_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const arrived = Number(stock_arrived)
    const left = Number(stock_left)
    if (!Number.isInteger(arrived) || arrived < 0 || !Number.isInteger(left) || left < 0) {
      return Response.json({ error: 'stock values must be non-negative integers' }, { status: 400 })
    }

    const aDate = new Date(arrival_date)
    const eDate = new Date(expiry_date)
    if (isNaN(aDate.getTime()) || isNaN(eDate.getTime())) {
      return Response.json({ error: 'Invalid date format' }, { status: 400 })
    }
    if (eDate <= aDate) {
      return Response.json({ error: 'expiry_date must be after arrival_date' }, { status: 400 })
    }

    const record = await prisma.medicine.findUnique({
      where: { id }
    })
    if (!record) {
      return Response.json({ error: 'Medicine not found' }, { status: 404 })
    }

    const updated = await prisma.medicine.update({
      where: { id },
      data: {
        arrivalDate: arrival_date,
        stockArrived: arrived,
        stockLeft: left,
        expiryDate: expiry_date,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

    return Response.json({
      id: updated.id,
      name: updated.name,
      category: updated.category,
      arrival_date: updated.arrivalDate,
      stock_arrived: updated.stockArrived,
      stock_left: updated.stockLeft,
      expiry_date: updated.expiryDate,
      updated_at: updated.updatedAt
    })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params
    const record = await prisma.medicine.findUnique({
      where: { id }
    })
    if (!record) {
      return Response.json({ error: 'Medicine not found' }, { status: 404 })
    }
    await prisma.medicine.delete({
      where: { id }
    })
    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}
