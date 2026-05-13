import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUserAdmin, ADMIN_ASSIGNABLE_ROLES } from '@/lib/permissions'
import { userCreateSchema } from '@/lib/validations/user'
import { writeAuditLog } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  const session = await requireUserAdmin()
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)

  const where: Record<string, unknown> = {}

  if (session.role === 'SUPER_ADMIN') {
    const municipalityId = searchParams.get('municipalityId')
    if (municipalityId) where.municipalityId = municipalityId
  } else {
    // ADMIN: always scoped to their municipality, only manageable roles
    where.municipalityId = session.municipalityId
    where.role = { in: ADMIN_ASSIGNABLE_ROLES }
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      municipalityId: true,
      municipality: { select: { name: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const session = await requireUserAdmin()
  if (session instanceof NextResponse) return session

  try {
    const body = await request.json()
    const result = userCreateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 },
      )
    }

    const { name, email, password, role, municipalityId, active, emailOnAssigned, emailOnNewReport } = result.data

    if (session.role === 'ADMIN') {
      if (!(ADMIN_ASSIGNABLE_ROLES as string[]).includes(role)) {
        return NextResponse.json(
          { error: 'Solo puedes crear usuarios con rol Operador o Visualizador' },
          { status: 403 },
        )
      }
      if (municipalityId !== session.municipalityId) {
        return NextResponse.json(
          { error: 'Solo puedes crear usuarios en tu propia municipalidad' },
          { status: 403 },
        )
      }
    }

    // Validate municipalityId exists
    if (municipalityId) {
      const mun = await prisma.municipality.findUnique({
        where: { id: municipalityId },
        select: { id: true },
      })
      if (!mun) {
        return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 400 })
      }
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        municipalityId: municipalityId ?? null,
        active,
        emailOnAssigned: emailOnAssigned ?? true,
        emailOnNewReport: emailOnNewReport ?? true,
      },
      select: {
        id: true, name: true, email: true, role: true, active: true, municipalityId: true, createdAt: true,
      },
    })

    await writeAuditLog({
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: user.id,
      entityLabel: user.email,
      userId: session.id,
      userName: session.name,
      metadata: { name, email, role, municipalityId: municipalityId ?? null, active },
    })

    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}
