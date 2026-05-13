import { z } from 'zod'

const EMERGENCY_TYPES = [
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
] as const

const phoneSchema = z
  .string()
  .min(7, 'Teléfono debe tener al menos 7 caracteres')
  .max(20, 'Teléfono no puede tener más de 20 caracteres')
  .regex(/^[+\d\s\-()]+$/, 'Formato de teléfono inválido')
  .optional()
  .nullable()

const latitudeSchema = z.number().min(-90, 'Latitud inválida').max(90, 'Latitud inválida').optional().nullable()
const longitudeSchema = z.number().min(-180, 'Longitud inválida').max(180, 'Longitud inválida').optional().nullable()

/** Valida una fecha opcional proveniente de input datetime-local (YYYY-MM-DDTHH:MM) o similar. */
const dateStringSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || val === '' || !isNaN(new Date(val).getTime()),
    { message: 'Fecha inválida' }
  )
  .transform((val) => (val && val !== '' ? val : null))

export const emergencySchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  type: z.enum(EMERGENCY_TYPES),
  priority: z.enum(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']),
  status: z.enum(['NUEVA', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'DESCARTADA']).optional(),
  address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres').max(300),
  sector: z.string().max(100).optional().nullable(),
  region: z.string().max(100).optional().nullable().transform((v) => v || null),
  commune: z.string().max(100).optional().nullable().transform((v) => v || null),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  reporterName: z.string().min(2).max(100).optional().nullable(),
  reporterPhone: phoneSchema,
  origin: z.enum(['INTERNO', 'CIUDADANO']),
  assignedToId: z.string().optional().nullable(),
  coAssigneeIds: z.array(z.string()).optional().default([]),
  occurredAt: dateStringSchema,
  observations: z.string().max(1000).optional().nullable(),
})

export type EmergencyFormData = z.infer<typeof emergencySchema>

export const publicReportSchema = z
  .object({
    reporterName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
    reporterPhone: z
      .string()
      .min(7, 'Teléfono debe tener al menos 7 caracteres')
      .max(20)
      .regex(/^[+\d\s\-()]+$/, 'Formato de teléfono inválido'),
    type: z.enum(EMERGENCY_TYPES),
    description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
    address: z.string().min(5, 'La dirección debe tener al menos 5 caracteres').max(300),
    sector: z.string().max(100).optional(),
    region: z.string().max(100).optional().nullable().transform((v) => v || null),
    commune: z.string().max(100).optional().nullable().transform((v) => v || null),
    latitude: latitudeSchema,
    longitude: longitudeSchema,
  })
  .refine((data) => !data.commune || !!data.region, {
    message: 'Debe seleccionar una región antes de seleccionar una comuna.',
    path: ['commune'],
  })

export type PublicReportFormData = z.infer<typeof publicReportSchema>

export const statusUpdateSchema = z.object({
  status: z.enum(['NUEVA', 'EN_ATENCION', 'RESUELTA', 'CERRADA', 'DESCARTADA']),
  closingNotes: z.string().max(1000).optional().nullable(),
})
