import Link from 'next/link'
import type { Emergency } from '@/types'
import { EMERGENCY_TYPE_LABELS, formatRelativeTime } from '@/lib/utils'
import StatusBadge from '@/components/emergencies/StatusBadge'
import PriorityBadge from '@/components/emergencies/PriorityBadge'

export default function RecentEmergencies({ emergencies }: { emergencies: Emergency[] }) {
  if (emergencies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No hay emergencias registradas aún.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-3 px-4 font-medium text-gray-500">Código</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Título</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Estado</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Prioridad</th>
            <th className="text-left py-3 px-4 font-medium text-gray-500">Hace</th>
          </tr>
        </thead>
        <tbody>
          {emergencies.map((e) => (
            <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4">
                <Link href={`/emergencias/${e.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                  {e.code}
                </Link>
              </td>
              <td className="py-3 px-4">
                <Link href={`/emergencias/${e.id}`} className="text-gray-900 hover:text-blue-600 font-medium">
                  {e.title}
                </Link>
              </td>
              <td className="py-3 px-4 text-gray-600">{EMERGENCY_TYPE_LABELS[e.type]}</td>
              <td className="py-3 px-4">
                <StatusBadge status={e.status} />
              </td>
              <td className="py-3 px-4">
                <PriorityBadge priority={e.priority} />
              </td>
              <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                {formatRelativeTime(e.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
