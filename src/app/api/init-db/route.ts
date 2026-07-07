import db from '@/lib/db'

export async function GET() {
  // Reference db to ensure module evaluation
  const _ = db;
  return Response.json({ status: 'db ready' })
}