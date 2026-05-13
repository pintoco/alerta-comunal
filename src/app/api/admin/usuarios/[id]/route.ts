import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAdmin, ADMIN_ASSIGNABLE_ROLES } from '@/lib/permissions'
import { userUpdateSchema } from '@/lib/validations/user'
import { writeAuditLog } from '@/lib/audit'

function canAdminAccessUser(
  sessionMunicipalityId: string | null | undefined,
  targetMunicipalityId: string | null,
  targetRole: string,
): boolean {
  return (
    targetMunicipalityId === sessionMunicipalityId &&
    (ADMIN_ASSIGNABLE_ROLES as string[]).includes(targetRole)
  )
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUserAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      municipalityId: true, emailOnAssigned: true, emailOnNewReport: true,
      municipality: { select: { id: true, name: true } },
      createdAt: true, updatedAt: true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  if (session.role === 'ADMIN' && !canAdminAccessUser(session.municipalityId, user.municipalityId, user.role)) {
    return NextResponse.json({ error: 'No tienes acceso a este usuario' }, { status: 403 })
  }

  return NextResponse.json(user)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireUserAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const body = await request.json()
    const result = userUpdateSchema.safeParse(body)

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
      // Can only manage OPERADOR/VISUALIZADOR of their own municipality
      if (!canAdminAccessUser(session.municipalityId, existing.municipalityId, existing.role)) {
        return NextResponse.json({ error: 'No tienes acceso a este usuario' }, { status: 403 })
      }
      // Cannot escalate role
      if (result.data.role && !(ADMIN_ASSIGNABLE_ROLES as string[]).includes(result.data.role)) {
        return NextResponse.json({ error: 'No puedes asignar ese rol' }, { status: 403 })
      }
      // Cannot change municipalityId
      if (
        result.data.municipalityId !== undefined &&
        result.data.municipalityId !== session.municipalityId
      ) {
        return NextResponse.json({ error: 'No puedes cambiar la municipalidad de un usuario' }, { status: 403 })
      }
      // Force municipalityId to stay as their own municipality
      result.data.municipalityId = session.municipalityId ?? undefined
    }

    if (result.data.email && result.data.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: result.data.email } })
      if (emailConflict) {
        return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: result.data,
      select: {
        id: true, name: true, email: true, role: true, active: true,
        municipalityId: true, emailOnAssigned: true, emailOnNewReport: true, updatedAt: true,
      },
    })

    await writeAuditLog({
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: user.id,
      entityLabel: user.email,
      userId: session.id,
      userName: session.name,
      metadata: result.data,
    })

    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}
