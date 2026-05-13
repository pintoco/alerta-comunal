import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAdmin, ADMIN_ASSIGNABLE_ROLES } from '@/lib/permissions'
import { passwordUpdateSchema } from '@/lib/validations/user'
import { writeAuditLog } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUserAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const body = await request.json()
  const result = passwordUpdateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: result.error.flatten() },
      { status: 400 },
    )
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (session.role === 'ADMIN') {
    if (
      existing.municipalityId !== session.municipalityId ||
      !(ADMIN_ASSIGNABLE_ROLES as string[]).includes(existing.role)
    ) {
      return NextResponse.json({ error: 'No tienes acceso a este usuario' }, { status: 403 })
    }
  }

  const hashedPassword = await bcrypt.hash(result.data.password, 10)

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  })

  await writeAuditLog({
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'USER',
    entityId: existing.id,
    entityLabel: existing.email,
    userId: session.id,
    userName: session.name,
  })

  return NextResponse.json({ success: true })
}
