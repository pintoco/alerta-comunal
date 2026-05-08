import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  let municipalityName: string | null = null
  let municipalityCommune: string | null = null
  let municipalityRegion: string | null = null

  if (session.municipalityId) {
    const municipality = await prisma.municipality.findUnique({
      where: { id: session.municipalityId },
      select: { name: true, commune: true, region: true },
    })
    municipalityName = municipality?.name ?? null
    municipalityCommune = municipality?.commune ?? null
    municipalityRegion = municipality?.region ?? null
  }

  return NextResponse.json({
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    municipalityId: session.municipalityId ?? null,
    municipalityName,
    municipalityCommune,
    municipalityRegion,
  })
}
