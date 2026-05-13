import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { z } from 'zod'

const schema = z.object({ active: z.boolean() })

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const body = await request.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const existing = await prisma.municipality.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const municipality = await prisma.municipality.update({
    where: { id },
    data: { active: result.data.active },
  })

  await writeAuditLog({
    action: result.data.active ? 'MUNICIPALITY_ACTIVATED' : 'MUNICIPALITY_DEACTIVATED',
    entityType: 'MUNICIPALITY',
    entityId: municipality.id,
    entityLabel: municipality.name,
    userId: session.id,
    userName: session.name,
  })

  return NextResponse.json(municipality)
}
