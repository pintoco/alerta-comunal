import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit'

// Lista pública de municipalidades activas (solo nombre y slug) para el
// selector del mapa público y del formulario de reportes por municipalidad.
export async function GET(request: Request) {
  const ip = getClientIpFromRequest(request)
  const rateLimit = await checkRateLimit(`public-municipios:${ip}`, 60, 5 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds ?? 300) },
      }
    )
  }

  const municipalities = await prisma.municipality.findMany({
    where: { active: true },
    select: { slug: true, name: true, logoUrl: true, primaryColor: true, plan: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(municipalities)
}
