import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/permissions'
import { getMunicipalityFilter, requireMunicipalityAssigned } from '@/lib/tenant'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const type = searchParams.get('type') || ''
  const sector = searchParams.get('sector') || ''
  const desde = searchParams.get('desde') || ''
  const hasta = searchParams.get('hasta') || ''

  const where: Record<string, unknown> = { ...getMunicipalityFilter(session) }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { reporterName: { contains: search, mode: 'insensitive' } },
    ]
  }
  if (status) where.status = status
  if (priority) where.priority = priority
  if (type) where.type = type
  if (sector) where.sector = { contains: sector, mode: 'insensitive' }

  if (desde || hasta) {
    const createdAt: Record<string, Date> = {}
    if (desde) { const d = new Date(desde); if (!isNaN(d.getTime())) createdAt.gte = d }
    if (hasta) { const d = new Date(hasta); if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); createdAt.lte = d } }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt
  }

  const emergencies = await prisma.emergency.findMany({
    where,
    include: { assignedTo: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  const header = [
    'Código', 'Título', 'Tipo', 'Prioridad', 'Estado', 'Dirección', 'Sector',
    'Origen', 'Reportante', 'Teléfono reportante', 'Responsable',
    'Fecha creación', 'Fecha ocurrencia', 'Fecha cierre',
  ]

  const rows = emergencies.map((e) => [
    e.code,
    e.title,
    e.type,
    e.priority,
    e.status,
    e.address,
    e.sector ?? '',
    e.origin,
    e.reporterName ?? '',
    e.reporterPhone ?? '',
    e.assignedTo?.name ?? '',
    e.createdAt.toISOString(),
    e.occurredAt?.toISOString() ?? '',
    e.closedAt?.toISOString() ?? '',
  ])

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const fileName = `emergencias_${new Date().toISOString().split('T')[0]}.csv`

  return new Response('﻿' + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
