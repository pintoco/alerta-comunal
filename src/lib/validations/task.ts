import { z } from 'zod'

/** Valida una fecha opcional proveniente de input type="date" (YYYY-MM-DD) o similar. */
const dateStringSchema = z
  .string()
  .optional()
  .nullable()
  .refine(
    (val) => !val || val === '' || !isNaN(new Date(val).getTime()),
    { message: 'Fecha límite inválida' }
  )
  .transform((val) => (val && val !== '' ? val : null))

export const taskSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres').max(200),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA']).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: dateStringSchema,
})

export type TaskFormData = z.infer<typeof taskSchema>
