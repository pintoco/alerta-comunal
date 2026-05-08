import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
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

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  // Protección: SUPER_ADMIN no puede desactivarse a sí mismo si es el único activo
  if (!result.data.active && existing.id === session.id) {
    const activeSuperAdmins = await prisma.user.count({
      where: { role: 'SUPER_ADMIN', active: true },
    })
    if (activeSuperAdmins <= 1) {
      return NextResponse.json(
        { error: 'No puedes desactivar el único Super Administrador activo' },
        { status: 400 }
      )
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: { active: result.data.active },
    select: { id: true, name: true, active: true },
  })

  return NextResponse.json(user)
}
