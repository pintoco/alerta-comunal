import { z } from 'zod'
import { CHILE_REGIONS_COMMUNES } from '@/data/chile-regions-communes'

const VALID_REGIONS = new Set(CHILE_REGIONS_COMMUNES.map((r) => r.region))
const REGION_COMMUNE_MAP = new Map(
  CHILE_REGIONS_COMMUNES.map((r) => [r.region, new Set(r.comunas)])
)

function validateRegionCommune(
  data: { region?: string | null; commune?: string | null },
  ctx: z.RefinementCtx
) {
  if (data.region && !VALID_REGIONS.has(data.region)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Región no válida',
      path: ['region'],
    })
  }
  if (data.region && data.commune) {
    const communes = REGION_COMMUNE_MAP.get(data.region)
    if (communes && !communes.has(data.commune)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La comuna no pertenece a la región seleccionada',
        path: ['commune'],
      })
    }
  }
}

const municipalityBaseObject = z.object({
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

export const municipalitySchema = municipalityBaseObject.superRefine(validateRegionCommune)

export const municipalityUpdateSchema = municipalityBaseObject
  .partial()
  .extend({ name: z.string().min(2).max(100).optional() })
  .superRefine(validateRegionCommune)
