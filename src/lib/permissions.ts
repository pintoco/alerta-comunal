import { NextResponse } from 'next/server'
import { getSession } from './auth'
import { prisma } from './prisma'
import type { Session, UserRole } from '@/types'

export async function getCurrentUser(): Promise<Session | null> {
  return getSession()
}

export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      active: true,
      municipalityId: true,
      municipality: { select: { active: true } },
    },
  })

  if (!user || !user.active) {
    return NextResponse.json({ error: 'Usuario desactivado o no encontrado' }, { status: 401 })
  }

  if (session.role !== 'SUPER_ADMIN' && user.municipalityId && user.municipality && !user.municipality.active) {
    return NextResponse.json({ error: 'La municipalidad asociada está inactiva' }, { status: 403 })
  }

  return session
}

export function requireRole(session: Session, roles: UserRole[]): NextResponse | null {
  if (!roles.includes(session.role)) {
    return NextResponse.json(
      { error: 'No tienes permisos para realizar esta acción' },
      { status: 403 }
    )
  }
  return null
}

export async function requireSuperAdmin(): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { error: 'Acceso restringido a Super Administradores' },
      { status: 403 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { active: true },
  })

  if (!user || !user.active) {
    return NextResponse.json({ error: 'Usuario desactivado o no encontrado' }, { status: 401 })
  }

  return session
}

export function isSuperAdmin(session: Session): boolean {
  return session.role === 'SUPER_ADMIN'
}

export function isMunicipalityAdmin(session: Session): boolean {
  return session.role === 'ADMIN'
}

export function isViewer(session: Session): boolean {
  return session.role === 'VISUALIZADOR'
}

export function canManageMunicipalities(session: Session): boolean {
  return session.role === 'SUPER_ADMIN'
}

export function canManageUsers(session: Session): boolean {
  return session.role === 'SUPER_ADMIN' || session.role === 'ADMIN'
}

export function canManageUsersInMunicipality(session: Session, municipalityId: string): boolean {
  if (session.role === 'SUPER_ADMIN') return true
  if (session.role === 'ADMIN') return session.municipalityId === municipalityId
  return false
}

export function canManageEmergencies(session: Session): boolean {
  return session.role === 'SUPER_ADMIN' || session.role === 'ADMIN' || session.role === 'OPERADOR'
}

/** Roles con permiso para crear/editar/eliminar emergencias */
export const MANAGE_ROLES: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPERADOR']

/**
 * Requires SUPER_ADMIN or ADMIN with a municipality assigned.
 * ADMIN without municipalityId gets 403.
 */
export async function requireUserAdmin(): Promise<Session | NextResponse> {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'No tienes permisos para administrar usuarios' }, { status: 403 })
  }

  if (session.role === 'ADMIN' && !session.municipalityId) {
    return NextResponse.json(
      { error: 'Administrador sin municipalidad asignada. Contacte al Super Administrador.' },
      { status: 403 },
    )
  }

  return session
}

/** Roles that ADMIN can assign when creating/editing users */
export const ADMIN_ASSIGNABLE_ROLES: UserRole[] = ['OPERADOR', 'VISUALIZADOR']
