import { NextResponse } from 'next/server'
import { prisma } from './prisma'
import type { Session } from '@/types'

/**
 * Returns Prisma where clause fragment for emergency municipality scoping.
 * ADMIN: {} (no restriction).
 * OPERADOR/VISUALIZADOR with municipalityId: { municipalityId }.
 * OPERADOR/VISUALIZADOR without municipalityId: { id: '__never__' } — returns zero results.
 * Always call requireMunicipalityAssigned first in API routes to get a proper 403 instead.
 */
export function getMunicipalityFilter(session: Session): Record<string, unknown> {
  if (session.role === 'ADMIN') return {}
  if (session.municipalityId) return { municipalityId: session.municipalityId }
  // Non-ADMIN without municipality: safe fallback that returns no results
  return { id: '__never__' }
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
