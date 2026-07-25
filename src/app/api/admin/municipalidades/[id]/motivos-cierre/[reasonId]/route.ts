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
  { params }: { params: Promise<{ id: string; reasonId: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id, reasonId } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const existing = await prisma.closingReason.findUnique({ where: { id: reasonId } })
  if (!existing || existing.municipalityId !== id) {
    return NextResponse.json({ error: 'Motivo de cierre no encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const reason = await prisma.closingReason.update({
    where: { id: reasonId },
    data: result.data,
  })

  await writeAuditLog({
    action: 'CLOSING_REASON_UPDATED',
    entityType: 'CLOSING_REASON',
    entityId: reason.id,
    entityLabel: reason.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, ...result.data },
  })

  return NextResponse.json(reason)
}
