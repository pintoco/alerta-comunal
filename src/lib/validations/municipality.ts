import { z } from 'zod'

export const municipalitySchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  slug: z
    .string()
    .min(2, 'El slug debe tener al menos 2 caracteres')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'El slug solo puede contener letras minúsculas, números y guiones'),
  region: z.string().max(100).optional().nullable(),
  commune: z.string().max(100).optional().nullable(),
  active: z.boolean().default(true),
})

export const municipalityUpdateSchema = municipalitySchema.partial().extend({
  name: z.string().min(2).max(100).optional(),
})
