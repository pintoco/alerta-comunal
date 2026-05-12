import { z } from 'zod'

const VALID_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERADOR', 'VISUALIZADOR'] as const

export const userCreateSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  email: z.string().email('Email inválido').max(150),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  role: z.enum(VALID_ROLES),
  municipalityId: z.string().cuid('ID de municipalidad inválido').optional().nullable(),
  active: z.boolean().default(true),
  emailOnAssigned: z.boolean().default(true),
  emailOnNewReport: z.boolean().default(true),
}).refine(
  (data) => {
    if (['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(data.role)) {
      return !!data.municipalityId
    }
    return true
  },
  { message: 'Este rol requiere una municipalidad asignada', path: ['municipalityId'] }
)

export const userUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  role: z.enum(VALID_ROLES).optional(),
  municipalityId: z.string().cuid().optional().nullable(),
  active: z.boolean().optional(),
  emailOnAssigned: z.boolean().optional(),
  emailOnNewReport: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.role && ['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(data.role)) {
      return data.municipalityId !== null && data.municipalityId !== undefined
    }
    return true
  },
  { message: 'Este rol requiere una municipalidad asignada', path: ['municipalityId'] }
)

export const passwordUpdateSchema = z.object({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
})
