import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
import { userCreateSchema } from '@/lib/validations/user'
import { writeAuditLog } from '@/lib/audit'
import bcrypt from 'bcryptjs'

export async function GET(request: Request) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { searchParams } = new URL(request.url)
  const municipalityId = searchParams.get('municipalityId')

  const where: Record<string, unknown> = {}
  if (municipalityId) where.municipalityId = municipalityId

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
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  try {
    const body = await request.json()
    const result = userCreateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { name, email, password, role, municipalityId, active } = result.data

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
