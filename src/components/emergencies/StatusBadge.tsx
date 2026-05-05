import type { EmergencyStatus } from '@/types'
import { STATUS_LABELS } from '@/lib/utils'

const statusStyles: Record<EmergencyStatus, string> = {
  NUEVA: 'bg-blue-100 text-blue-800',
  EN_ATENCION: 'bg-yellow-100 text-yellow-800',
  RESUELTA: 'bg-green-100 text-green-800',
  CERRADA: 'bg-gray-100 text-gray-700',
  DESCARTADA: 'bg-red-100 text-red-700',
}

export default function StatusBadge({ status }: { status: EmergencyStatus }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
