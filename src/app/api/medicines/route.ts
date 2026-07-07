import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

const CATEGORIES = ['tablet', 'syrup', 'injection', 'capsule']

export async function GET() {
  try {
    const rows = await prisma.medicine.findMany({
      orderBy: {
        name: 'asc'
      }
    })
    const mapped = rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      arrival_date: r.arrivalDate,
      stock_arrived: r.stockArrived,
      stock_left: r.stockLeft,
      expiry_date: r.expiryDate,
      updated_at: r.updatedAt
    }))
    return Response.json(mapped)
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, category, arrival_date, stock_arrived, stock_left, expiry_date } = body

    if (!name || !category || !arrival_date || !expiry_date) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 })
    }
    if (!CATEGORIES.includes(category)) {
      return Response.json({ error: `category must be one of ${CATEGORIES.join(', ')}` }, { status: 400 })
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

    const id = randomUUID()
    const created = await prisma.medicine.create({
      data: {
        id,
        name,
        category,
        arrivalDate: arrival_date,
        stockArrived: arrived,
        stockLeft: left,
        expiryDate: expiry_date,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    })

    return Response.json({
      id: created.id,
      name: created.name,
      category: created.category,
      arrival_date: created.arrivalDate,
      stock_arrived: created.stockArrived,
      stock_left: created.stockLeft,
      expiry_date: created.expiryDate,
      updated_at: created.updatedAt
    }, { status: 201 })
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 })
  }
}
