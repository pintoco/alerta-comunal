export type UserRole = 'ADMIN' | 'OPERADOR' | 'VISUALIZADOR'

export type EmergencyType =
  | 'INCENDIO'
  | 'INUNDACION'
  | 'CAIDA_ARBOL'
  | 'CORTE_CAMINO'
  | 'CORTE_ELECTRICO'
  | 'DANO_VIVIENDA'
  | 'EMERGENCIA_SOCIAL'
  | 'ACCIDENTE'
  | 'RIESGO_SANITARIO'
  | 'INFRAESTRUCTURA_PUBLICA'
  | 'OTRO'

export type Priority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'

export type EmergencyStatus =
  | 'NUEVA'
  | 'EN_ATENCION'
  | 'RESUELTA'
  | 'CERRADA'
  | 'DESCARTADA'

export type ReportOrigin = 'INTERNO' | 'CIUDADANO'

export type TaskStatus = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADA' | 'CANCELADA'

export interface Municipality {
  id: string
  name: string
  slug: string
  region?: string | null
  commune?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  active: boolean
  municipalityId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Emergency {
  id: string
  code: string
  title: string
  description: string
  type: EmergencyType
  priority: Priority
  status: EmergencyStatus
  address: string
  sector?: string | null
  latitude?: number | null
  longitude?: number | null
  reporterName?: string | null
  reporterPhone?: string | null
  origin: ReportOrigin
  assignedToId?: string | null
  assignedTo?: User | null
  municipalityId?: string | null
  occurredAt?: string | null
  closedAt?: string | null
  closingNotes?: string | null
  observations?: string | null
  createdAt: string
  updatedAt: string
  evidences?: Evidence[]
  tasks?: Task[]
  activityLogs?: ActivityLog[]
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
  emergencyId: string
  title: string
  description?: string | null
  status: TaskStatus
  assignedToId?: string | null
  assignedTo?: User | null
  dueDate?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ActivityLog {
  id: string
  emergencyId: string
  userId?: string | null
  user?: User | null
  action: string
  description: string
  createdAt: string
}

export interface Session {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface DashboardStats {
  total: number
  nueva: number
  enAtencion: number
  resuelta: number
  cerrada: number
  descartada: number
  critica: number
}

export interface EmergencyFilters {
  search?: string
  status?: EmergencyStatus | ''
  priority?: Priority | ''
  type?: EmergencyType | ''
  sector?: string
}
