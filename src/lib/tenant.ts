import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import type { Session } from '@/types'

/**
 * Returns Prisma where clause fragment for emergency municipality scoping.
 * ADMIN: null (no restriction).
 * OPERADOR/VISUALIZADOR with municipalityId: { municipalityId }.
 * OPERADOR/VISUALIZADOR without municipalityId: use requireMunicipalityAssigned before calling.
 */
export function getMunicipalityFilter(session: Session): { municipalityId: string } | Record<string, never> {
  if (session.role === 'ADMIN') return {}
  if (session.municipalityId) return { municipalityId: session.municipalityId }
  return {}
}

/**
 * For non-ADMIN users without municipalityId, returns 403.
 * Call at the start of protected API routes.
 */
export function requireMunicipalityAssigned(session: Session): NextResponse | null {
  if (session.role !== 'ADMIN' && !session.municipalityId) {
    return NextResponse.json(
      { error: 'Usuario sin municipalidad asignada.' },
      { status: 403 }
    )
  }
  return null
}

/** Whether session can access an emergency with the given municipalityId */
export function canAccessEmergency(session: Session, emergencyMunicipalityId: string | null): boolean {
  if (session.role === 'ADMIN') return true
  if (!session.municipalityId) return false
  return emergencyMunicipalityId === session.municipalityId
}

/**
 * Fetches emergency by id and checks municipality access.
 * Returns NextResponse on error (404/403), or the emergency on success.
 */
export async function requireEmergencyAccess(
  session: Session,
  emergencyId: string
): Promise<NextResponse | { id: string; municipalityId: string | null }> {
  const emergency = await prisma.emergency.findUnique({
    where: { id: emergencyId },
    select: { id: true, municipalityId: true },
  })

  if (!emergency) {
    return NextResponse.json({ error: 'Emergencia no encontrada' }, { status: 404 })
  }

  if (!canAccessEmergency(session, emergency.municipalityId)) {
    return NextResponse.json(
      { error: 'No tienes acceso a esta emergencia.' },
      { status: 403 }
    )
  }

  return emergency
}

/**
 * For page-level scoping (server components).
 * Returns Prisma where clause or false when user has no municipality assigned.
 */
export function getEmergencyScope(session: Session): Record<string, unknown> | false {
  if (session.role === 'ADMIN') return {}
  if (!session.municipalityId) return false
  return { municipalityId: session.municipalityId }
}
