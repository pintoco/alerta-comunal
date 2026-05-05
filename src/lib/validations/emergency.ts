import { z } from 'zod'

export const emergencySchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  type: z.enum([
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
  ]),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  status: z.enum(['NUEVA', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'DESCARTADA']).optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  sector: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  reporterName: z.string().optional().nullable(),
  reporterPhone: z.string().optional().nullable(),
  origin: z.enum(['INTERNO', 'CIUDADANO']),
  assignedToId: z.string().optional().nullable(),
  occurredAt: z.string().optional().nullable(),
  observations: z.string().optional().nullable(),
})

export type EmergencyFormData = z.infer<typeof emergencySchema>

export const publicReportSchema = z.object({
  reporterName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  reporterPhone: z.string().min(8, 'Teléfono inválido'),
  type: z.enum([
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
  ]),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres'),
  sector: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
})

export type PublicReportFormData = z.infer<typeof publicReportSchema>

export const statusUpdateSchema = z.object({
  status: z.enum(['NUEVA', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'DESCARTADA']),
  closingNotes: z.string().optional().nullable(),
})
