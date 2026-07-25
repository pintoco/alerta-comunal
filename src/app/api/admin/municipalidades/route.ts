import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
import { municipalitySchema } from '@/lib/validations/municipality'
import { writeAuditLog } from '@/lib/audit'

// Motivos de cierre por defecto para cualquier municipalidad nueva — cada una
// puede editar/agregar los suyos desde /admin/municipalidades/[id]/motivos-cierre.
const DEFAULT_CLOSING_REASONS = [
  'Resuelto en terreno',
  'Derivado a otra entidad',
  'Reporte duplicado',
  'Sin mérito',
  'Otro',
]

export async function GET() {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  const municipalities = await prisma.municipality.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, emergencies: true } },
    },
  })

  return NextResponse.json(municipalities)
}

export async function POST(request: Request) {
  const session = await requireSuperAdmin()
  if (session instanceof NextResponse) return session

  try {
    const body = await request.json()
    const result = municipalitySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { name, slug, region, commune, active } = result.data

    const existing = await prisma.municipality.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'Ya existe una municipalidad con ese slug' }, { status: 409 })
    }

    const municipality = await prisma.municipality.create({
      data: { name, slug, region: region || null, commune: commune || null, active },
    })

    await prisma.closingReason.createMany({
      data: DEFAULT_CLOSING_REASONS.map((label, order) => ({
        municipalityId: municipality.id,
        label,
        order,
      })),
    })

    await writeAuditLog({
      action: 'MUNICIPALITY_CREATED',
      entityType: 'MUNICIPALITY',
      entityId: municipality.id,
      entityLabel: municipality.name,
      userId: session.id,
      userName: session.name,
      metadata: { slug, region: region || null, commune: commune || null, active },
    })

    return NextResponse.json(municipality, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear municipalidad' }, { status: 500 })
  }
}
