import type { Session } from '@/types'

/**
 * Oculta reporterName/reporterPhone para VISUALIZADOR — enforced en la capa de
 * serialización (ver PII Rules en CLAUDE.md), no en la query, para que quede
 * centralizado en un único lugar reusado por listado y detalle.
 */
export function redactPII<T extends { reporterName: string | null; reporterPhone: string | null }>(
  emergency: T,
  session: Session
): T {
  if (session.role !== 'VISUALIZADOR') return emergency
  return { ...emergency, reporterName: null, reporterPhone: null }
}
