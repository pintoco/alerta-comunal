import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/permissions'
import { getMunicipalityFilter } from '@/lib/tenant'

// Lista de categorías activas para el filtro/formulario interno de
// emergencias, scopeada igual que el resto de queries de emergencias
// (getMunicipalityFilter). Para SUPER_ADMIN (scope global), dos
// municipalidades distintas con una categoría de mismo label ("Incendio")
// se fusionan en una sola entrada — mismo criterio que el dashboard.
export async function GET() {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const scope = getMunicipalityFilter(session)

  const categories = await prisma.emergencyCategory.findMany({
    where: { ...scope, active: true },
    select: { label: true },
    orderBy: { label: 'asc' },
  })

  const labels = Array.from(new Set(categories.map((c) => c.label))).sort((a, b) =>
    a.localeCompare(b, 'es')
  )

  return NextResponse.json(labels)
}
