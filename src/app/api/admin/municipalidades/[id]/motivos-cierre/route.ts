import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const reasonSchema = z.object({
  label: z.string().min(2, 'El motivo debe tener al menos 2 caracteres').max(80),
})

// GET es de lectura para cualquier rol de la propia municipalidad (no solo
// SUPER_ADMIN/ADMIN) — OPERADOR necesita ver los motivos activos para cerrar
// una emergencia. POST/PUT (en [reasonId]/route.ts) siguen siendo solo
// SUPER_ADMIN/ADMIN de su propia municipalidad.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const { id } = await params

  if (session.role !== 'SUPER_ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const reasons = await prisma.closingReason.findMany({
    where: { municipalityId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(reasons)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const municipality = await prisma.municipality.findUnique({ where: { id }, select: { id: true } })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const result = reasonSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const maxOrder = await prisma.closingReason.aggregate({
    where: { municipalityId: id },
    _max: { order: true },
  })

  const reason = await prisma.closingReason.create({
    data: {
      municipalityId: id,
      label: result.data.label,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  await writeAuditLog({
    action: 'CLOSING_REASON_CREATED',
    entityType: 'CLOSING_REASON',
    entityId: reason.id,
    entityLabel: reason.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, label: reason.label },
  })

  return NextResponse.json(reason, { status: 201 })
}
