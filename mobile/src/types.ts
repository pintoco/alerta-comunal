// Subconjunto de src/types/index.ts (app web) — solo lo que la app móvil
// necesita mostrar/editar en el MVP (lista, detalle, cambio de estado,
// evidencia). Mantener en sync a mano si el shape de la API cambia.

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERADOR' | 'VISUALIZADOR'

export type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type EmergencyStatus = 'NUEVA' | 'EN_ATENCION' | 'RESUELTA' | 'CERRADA' | 'DESCARTADA'

export interface Session {
  id: string
  name: string
  email: string
  role: UserRole
  municipalityId: string | null
  municipalityName: string | null
}

export interface Evidence {
  id: string
  emergencyId: string
  filename: string
  originalName: string
  url: string
  mimeType: string
  size: number
  description?: string | null
  createdAt: string
}

export interface Task {
  id: string
  title: string
  description?: string | null
  status: 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'
  dueDate?: string | null
}

export interface ClosingReason {
  id: string
  label: string
  active: boolean
}

export interface EmergencyListItem {
  id: string
  code: string
  title: string
  priority: Priority
  status: EmergencyStatus
  address: string
  sector?: string | null
  category?: { id: string; label: string } | null
  createdAt: string
}

export interface EmergencyDetail extends EmergencyListItem {
  description: string
  region?: string | null
  commune?: string | null
  latitude?: number | null
  longitude?: number | null
  reporterName?: string | null
  reporterPhone?: string | null
  closingNotes?: string | null
  closingReasonId?: string | null
  closingReason?: { id: string; label: string } | null
  evidences?: Evidence[]
  tasks?: Task[]
}
