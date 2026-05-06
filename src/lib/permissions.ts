import { NextResponse } from 'next/server'
import { getSession } from './auth'
import type { Session, UserRole } from '@/types'

export async function getCurrentUser(): Promise<Session | null> {
  return getSession()
}

/**
 * Verifica autenticación. Retorna Session si ok, NextResponse 401 si no.
 * Uso: const s = await requireAuth(); if (s instanceof NextResponse) return s
 */
export async function requireAuth(): Promise<Session | NextResponse> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  return session
}

/**
 * Verifica que session tenga uno de los roles requeridos.
 * Retorna NextResponse 403 si no tiene permiso, null si está autorizado.
 */
export function requireRole(session: Session, roles: UserRole[]): NextResponse | null {
  if (!roles.includes(session.role)) {
    return NextResponse.json(
      { error: 'No tienes permisos para realizar esta acción' },
      { status: 403 }
    )
  }
  return null
}

export function isViewer(session: Session): boolean {
  return session.role === 'VISUALIZADOR'
}

export function canManageEmergencies(session: Session): boolean {
  return session.role === 'ADMIN' || session.role === 'OPERADOR'
}

/** Roles con permiso para crear/editar/eliminar */
export const MANAGE_ROLES: UserRole[] = ['ADMIN', 'OPERADOR']
