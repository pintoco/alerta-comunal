import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const unitSchema = z.object({
  label: z.string().min(2, 'La unidad debe tener al menos 2 caracteres').max(80),
})

// GET es de lectura para cualquier rol de la propia municipalidad (no solo
// SUPER_ADMIN/ADMIN) — se necesita para poblar el selector de unidad en el
// formulario de usuarios. POST/PUT (en [unitId]/route.ts) siguen siendo solo
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

  const units = await prisma.operationalUnit.findMany({
    where: { municipalityId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(units)
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
  const result = unitSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const maxOrder = await prisma.operationalUnit.aggregate({
    where: { municipalityId: id },
    _max: { order: true },
  })

  const unit = await prisma.operationalUnit.create({
    data: {
      municipalityId: id,
      label: result.data.label,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  await writeAuditLog({
    action: 'OPERATIONAL_UNIT_CREATED',
    entityType: 'OPERATIONAL_UNIT',
    entityId: unit.id,
    entityLabel: unit.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, label: unit.label },
  })

  return NextResponse.json(unit, { status: 201 })
}
