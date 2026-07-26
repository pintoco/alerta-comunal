import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const updateSchema = z.object({
  label: z.string().min(2).max(80).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; unitId: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id, unitId } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const existing = await prisma.operationalUnit.findUnique({ where: { id: unitId } })
  if (!existing || existing.municipalityId !== id) {
    return NextResponse.json({ error: 'Unidad operacional no encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const unit = await prisma.operationalUnit.update({
    where: { id: unitId },
    data: result.data,
  })

  await writeAuditLog({
    action: 'OPERATIONAL_UNIT_UPDATED',
    entityType: 'OPERATIONAL_UNIT',
    entityId: unit.id,
    entityLabel: unit.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, ...result.data },
  })

  return NextResponse.json(unit)
}
