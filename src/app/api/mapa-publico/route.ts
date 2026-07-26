import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit'

export async function GET(request: Request) {
  const ip = getClientIpFromRequest(request)
  const rateLimit = await checkRateLimit(`public-map:${ip}`, 60, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes al mapa público. Intenta nuevamente más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds ?? 300) },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  // ?slug= permite un mapa público por municipalidad (/mapa-publico/[slug]).
  // Sin slug, cae al comportamiento histórico de una sola municipalidad por env var.
  const slug = searchParams.get('slug') || process.env.PUBLIC_DEFAULT_MUNICIPALITY_SLUG

  let municipalityId: string | undefined
  if (slug) {
    const muni = await prisma.municipality.findUnique({
      where: { slug },
      select: { id: true, active: true },
    })
    if (searchParams.get('slug') && (!muni || !muni.active)) {
      return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
    }
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
      category: { select: { id: true, label: true } },
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
