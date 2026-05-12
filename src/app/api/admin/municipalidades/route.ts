import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/permissions'
import { municipalitySchema } from '@/lib/validations/municipality'

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

    return NextResponse.json(municipality, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear municipalidad' }, { status: 500 })
  }
}
