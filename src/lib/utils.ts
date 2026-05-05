import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { EmergencyType, Priority, EmergencyStatus, TaskStatus, UserRole } from '@/types'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es })
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: es, addSuffix: true })
}

export const EMERGENCY_TYPE_LABELS: Record<EmergencyType, string> = {
  INCENDIO: 'Incendio',
  INUNDACION: 'Inundación',
  CAIDA_ARBOL: 'Caída de árbol',
  CORTE_CAMINO: 'Corte de camino',
  CORTE_ELECTRICO: 'Corte eléctrico',
  DANO_VIVIENDA: 'Daño en vivienda',
  EMERGENCIA_SOCIAL: 'Emergencia social',
  ACCIDENTE: 'Accidente',
  RIESGO_SANITARIO: 'Riesgo sanitario',
  INFRAESTRUCTURA_PUBLICA: 'Infraestructura pública',
  OTRO: 'Otro',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
}

export const STATUS_LABELS: Record<EmergencyStatus, string> = {
  NUEVA: 'Nueva',
  EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta',
  CERRADA: 'Cerrada',
  DESCARTADA: 'Descartada',
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Completada',
  CANCELADA: 'Cancelada',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

export const EMERGENCY_TYPES: EmergencyType[] = [
  'INCENDIO',
  'INUNDACION',
  'CAIDA_ARBOL',
  'CORTE_CAMINO',
  'CORTE_ELECTRICO',
  'DANO_VIVIENDA',
  'EMERGENCIA_SOCIAL',
  'ACCIDENTE',
  'RIESGO_SANITARIO',
  'INFRAESTRUCTURA_PUBLICA',
  'OTRO',
]

export const PRIORITIES: Priority[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']

export const STATUSES: EmergencyStatus[] = [
  'NUEVA',
  'EN_ATENCION',
  'RESUELTA',
  'CERRADA',
  'DESCARTADA',
]

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
