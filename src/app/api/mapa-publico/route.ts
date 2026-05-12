import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const slug = process.env.PUBLIC_DEFAULT_MUNICIPALITY_SLUG

  let municipalityId: string | undefined
  if (slug) {
    const muni = await prisma.municipality.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (muni) municipalityId = muni.id
  }

  const where: Record<string, unknown> = {
    latitude: { not: null },
    longitude: { not: null },
    status: { notIn: ['CERRADA', 'DESCARTADA'] },
  }

  if (municipalityId) {
    where.municipalityId = municipalityId
  }

  const emergencies = await prisma.emergency.findMany({
    where,
    select: {
      id: true,
      code: true,
      title: true,
      type: true,
      priority: true,
      status: true,
      address: true,
      sector: true,
      latitude: true,
      longitude: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })

  return NextResponse.json(emergencies)
}
