import Link from 'next/link'
import type { Emergency } from '@/types'
import { EMERGENCY_TYPE_LABELS, formatDate } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import PriorityBadge from './PriorityBadge'

interface EmergencyTableProps {
  emergencies: Emergency[]
  canEdit: boolean
}

export default function EmergencyTable({ emergencies, canEdit }: EmergencyTableProps) {
  if (emergencies.length === 0) {
    return (
      <div className="card p-12 text-center">
        <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500">No se encontraron emergencias con los filtros aplicados.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Código</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Título</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Tipo</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Prioridad</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Estado</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Sector</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Responsable</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Fecha</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {emergencies.map((e) => (
              <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <span className="font-mono text-xs text-gray-600">{e.code}</span>
                </td>
                <td className="py-3 px-4">
                  <p className="font-medium text-gray-900 max-w-xs truncate">{e.title}</p>
                  <p className="text-xs text-gray-400 truncate max-w-xs">{e.address}</p>
                </td>
                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                  {EMERGENCY_TYPE_LABELS[e.type]}
                </td>
                <td className="py-3 px-4">
                  <PriorityBadge priority={e.priority} />
                </td>
                <td className="py-3 px-4">
                  <StatusBadge status={e.status} />
                </td>
                <td className="py-3 px-4 text-gray-600">{e.sector || '—'}</td>
                <td className="py-3 px-4 text-gray-600">
                  {e.assignedTo?.name || <span className="text-gray-400">Sin asignar</span>}
                </td>
                <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                  {formatDate(e.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/emergencias/${e.id}`}
                      className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      Ver
                    </Link>
                    {canEdit && (
                      <Link
                        href={`/emergencias/${e.id}/editar`}
                        className="text-gray-600 hover:text-gray-800 text-xs font-medium"
                      >
                        Editar
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
