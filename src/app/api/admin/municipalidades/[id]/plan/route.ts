import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireSuperAdmin, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { PLAN_LIMITS } from '@/lib/plans'
import { getMunicipalityUsage } from '@/lib/plans-usage'

const planSchema = z.object({ plan: z.enum(['GRATUITO', 'BASICO', 'PRO']) })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    select: { plan: true },
  })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const usage = await getMunicipalityUsage(id)

  return NextResponse.json({
    plan: municipality.plan,
    limits: PLAN_LIMITS[municipality.plan],
    usage,
    canEdit: session.role === 'SUPER_ADMIN',
  })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const body = await request.json()
  const result = planSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const existing = await prisma.municipality.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const municipality = await prisma.municipality.update({
    where: { id },
    data: { plan: result.data.plan },
  })

  await writeAuditLog({
    action: 'MUNICIPALITY_PLAN_UPDATED',
    entityType: 'MUNICIPALITY',
    entityId: municipality.id,
    entityLabel: municipality.name,
    userId: session.id,
    userName: session.name,
    metadata: { from: existing.plan, to: result.data.plan },
  })

  return NextResponse.json({ plan: municipality.plan, limits: PLAN_LIMITS[municipality.plan] })
}
