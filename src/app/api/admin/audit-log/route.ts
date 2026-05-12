import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const action = searchParams.get('action') || ''
  const limit = 50
  const skip = (page - 1) * limit
  const where = action ? { action } : {}

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({ where }),
  ])

  return NextResponse.json({ logs, total, page, pages: Math.ceil(total / limit) })
}
