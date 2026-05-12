import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const data = await getDashboardData(session)
  return NextResponse.json(data)
}
