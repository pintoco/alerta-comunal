import type { Priority } from '@/types'
import { PRIORITY_LABELS } from '@/lib/utils'

const priorityStyles: Record<Priority, string> = {
  BAJA: 'bg-green-100 text-green-800',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  ALTA: 'bg-orange-100 text-orange-800',
  CRITICA: 'bg-red-100 text-red-800 font-semibold',
}

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityStyles[priority]}`}>
      {priority === 'CRITICA' && '⚠ '}
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
