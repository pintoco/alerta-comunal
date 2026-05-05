import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(3, 'El título debe tener al menos 3 caracteres'),
  description: z.string().optional().nullable(),
  status: z.enum(['PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA']).optional(),
  assignedToId: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
})

export type TaskFormData = z.infer<typeof taskSchema>
