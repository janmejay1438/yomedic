import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const rows = await prisma.bloodInventory.findMany({
      orderBy: {
        bloodType: 'asc'
      }
    });
    const mapped = rows.map(r => ({
      id: r.id,
      blood_type: r.bloodType,
      quantity_units: r.quantityUnits,
      collection_date: r.collectionDate,
      expiry_date: r.expiryDate,
      updated_at: r.updatedAt
    }));
    return Response.json(mapped);
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, quantity_units, collection_date, expiry_date } = body;

    if (!id) {
      return Response.json({ error: 'Missing required field: id' }, { status: 400 });
    }

    if (quantity_units === undefined || quantity_units === null) {
      return Response.json({ error: 'Missing required field: quantity_units' }, { status: 400 });
    }

    // Validate quantity_units is a non-negative integer
    const quantity = Number(quantity_units);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return Response.json({ error: 'quantity_units must be a non-negative integer' }, { status: 400 });
    }

    // Validate expiry_date is not before collection_date
    if (collection_date && expiry_date) {
      const colDate = new Date(collection_date);
      const expDate = new Date(expiry_date);
      if (isNaN(colDate.getTime()) || isNaN(expDate.getTime())) {
        return Response.json({ error: 'Invalid date format' }, { status: 400 });
      }
      if (expDate < colDate) {
        return Response.json({ error: 'expiry_date cannot be before collection_date' }, { status: 400 });
      }
    }

    // Check if the record exists
    const record = await prisma.bloodInventory.findUnique({
      where: { id }
    });
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // Update the row
    const updated = await prisma.bloodInventory.update({
      where: { id },
      data: {
        quantityUnits: quantity,
        collectionDate: collection_date || null,
        expiryDate: expiry_date || null,
        updatedAt: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }
    });

    return Response.json({
      id: updated.id,
      blood_type: updated.bloodType,
      quantity_units: updated.quantityUnits,
      collection_date: updated.collectionDate,
      expiry_date: updated.expiryDate,
      updated_at: updated.updatedAt
    });
  } catch (error: any) {
    return Response.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
