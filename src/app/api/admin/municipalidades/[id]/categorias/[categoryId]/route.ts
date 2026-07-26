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
  { params }: { params: Promise<{ id: string; categoryId: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id, categoryId } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const existing = await prisma.emergencyCategory.findUnique({ where: { id: categoryId } })
  if (!existing || existing.municipalityId !== id) {
    return NextResponse.json({ error: 'Categoría de emergencia no encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const category = await prisma.emergencyCategory.update({
    where: { id: categoryId },
    data: result.data,
  })

  await writeAuditLog({
    action: 'EMERGENCY_CATEGORY_UPDATED',
    entityType: 'EMERGENCY_CATEGORY',
    entityId: category.id,
    entityLabel: category.label,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, ...result.data },
  })

  return NextResponse.json(category)
}
