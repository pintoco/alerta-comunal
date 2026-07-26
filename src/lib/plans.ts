import type { SubscriptionPlanId } from '@/types'

export type { SubscriptionPlanId }

export interface PlanLimits {
  label: string
  /** null = sin límite */
  maxEmergenciesPerMonth: number | null
  maxActiveUsers: number | null
  maxStorageMb: number | null
  showBadge: boolean
}

export const PLAN_ORDER: SubscriptionPlanId[] = ['GRATUITO', 'BASICO', 'PRO']

// Sin import de Prisma en este archivo a propósito: se usa también desde
// componentes cliente (ReportarForm, MapaPublicoView) para decidir si
// mostrar el badge "Powered by Elemental Pro" en las páginas públicas.
export const PLAN_LIMITS: Record<SubscriptionPlanId, PlanLimits> = {
  GRATUITO: {
    label: 'Gratuito',
    maxEmergenciesPerMonth: 30,
    maxActiveUsers: 3,
    maxStorageMb: 200,
    showBadge: true,
  },
  BASICO: {
    label: 'Básico',
    maxEmergenciesPerMonth: 150,
    maxActiveUsers: 10,
    maxStorageMb: 2000,
    showBadge: false,
  },
  PRO: {
    label: 'Pro',
    maxEmergenciesPerMonth: null,
    maxActiveUsers: null,
    maxStorageMb: null,
    showBadge: false,
  },
}
