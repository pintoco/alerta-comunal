import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'

const categorySchema = z.object({
  label: z.string().min(2, 'La categoría debe tener al menos 2 caracteres').max(80),
})

// GET es de lectura para cualquier rol de la propia municipalidad (no solo
// SUPER_ADMIN/ADMIN) — OPERADOR/VISUALIZADOR necesitan ver las categorías
// activas para crear/filtrar emergencias. POST/PUT (en [categoryId]/route.ts)
// siguen siendo solo SUPER_ADMIN/ADMIN de su propia municipalidad.
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

  const categories = await prisma.emergencyCategory.findMany({
    where: { municipalityId: id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(categories)
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
  const result = categorySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const maxOrder = await prisma.emergencyCategory.aggregate({
    where: { municipalityId: id },
    _max: { order: true },
  })

  const category = await prisma.emergencyCategory.create({
    data: {
      municipalityId: id,
      label: result.data.label,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  })

  await writeAuditLog({
    action: 'EMERGENCY_CATEGORY_CREATED',
    entityType: 'EMERGENCY_CATEGORY',
    entityId: category.id,
    entityLabel: category.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, label: category.label },
  })

  return NextResponse.json(category, { status: 201 })
}
