import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
import { municipalityUpdateSchema } from '@/lib/validations/municipality'
import { writeAuditLog } from '@/lib/audit'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, emergencies: true } },
      users: {
        select: { id: true, name: true, email: true, role: true, active: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  return NextResponse.json(municipality)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const { id } = await params

  try {
    const body = await request.json()
    const result = municipalityUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await prisma.municipality.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
    }

    // Slug change check: warn if slug conflicts with another municipality
    if (result.data.slug && result.data.slug !== existing.slug) {
      const slugConflict = await prisma.municipality.findFirst({
        where: { slug: result.data.slug, NOT: { id } },
      })
      if (slugConflict) {
        return NextResponse.json({ error: 'Ya existe una municipalidad con ese slug' }, { status: 409 })
      }
    }

    const { region, commune, ...rest } = result.data
    const municipality = await prisma.municipality.update({
      where: { id },
      data: {
        ...rest,
        ...(region !== undefined && { region: region || null }),
        ...(commune !== undefined && { commune: commune || null }),
      },
    })

    await writeAuditLog({
      action: 'MUNICIPALITY_UPDATED',
      entityType: 'MUNICIPALITY',
      entityId: municipality.id,
      entityLabel: municipality.name,
      userId: session.id,
      userName: session.name,
      metadata: result.data,
    })

    return NextResponse.json(municipality)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar municipalidad' }, { status: 500 })
  }
}
