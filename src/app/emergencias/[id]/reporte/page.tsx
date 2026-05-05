import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import {
  EMERGENCY_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUS_LABELS,
  formatDate,
} from '@/lib/utils'
import PrintButtons from '@/components/emergencies/PrintButtons'

export default async function ReportePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const emergency = await prisma.emergency.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true, email: true } },
      evidences: { orderBy: { createdAt: 'asc' } },
      tasks: {
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!emergency) notFound()

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11pt; }
          .page-break { page-break-before: always; }
        }
        body { font-family: system-ui, -apple-system, sans-serif; background: white; color: #111; }
      `}</style>

      <PrintButtons />

      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-blue-900 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-900">AlertaComunal</h1>
                <p className="text-gray-500 text-xs">Sistema de Gestión de Emergencias Municipales</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">REPORTE DE EMERGENCIA</p>
            <p className="text-2xl font-bold font-mono text-blue-900">{emergency.code}</p>
            <p className="text-xs text-gray-500 mt-1">Generado: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Status banner */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Estado</p>
            <p className="font-bold text-lg">{STATUS_LABELS[emergency.status]}</p>
          </div>
          <div className="w-px h-10 bg-gray-300" />
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Prioridad</p>
            <p className="font-bold text-lg">{PRIORITY_LABELS[emergency.priority]}</p>
          </div>
          <div className="w-px h-10 bg-gray-300" />
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Tipo</p>
            <p className="font-bold text-lg">{EMERGENCY_TYPE_LABELS[emergency.type]}</p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-gray-900 mb-6">{emergency.title}</h2>

        {/* Grid info */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Datos generales</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500 w-1/2">Código</td>
                  <td className="py-2 font-mono font-medium">{emergency.code}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">Origen</td>
                  <td className="py-2">{emergency.origin === 'CIUDADANO' ? 'Ciudadano' : 'Interno'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">Creación</td>
                  <td className="py-2">{formatDate(emergency.createdAt)}</td>
                </tr>
                {emergency.occurredAt && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Ocurrencia</td>
                    <td className="py-2">{formatDate(emergency.occurredAt)}</td>
                  </tr>
                )}
                {emergency.closedAt && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Cierre</td>
                    <td className="py-2">{formatDate(emergency.closedAt)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Ubicación y responsable</h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500 w-1/2">Dirección</td>
                  <td className="py-2">{emergency.address}</td>
                </tr>
                {emergency.sector && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Sector</td>
                    <td className="py-2">{emergency.sector}</td>
                  </tr>
                )}
                {emergency.latitude && emergency.longitude && (
                  <tr className="border-b border-gray-100">
                    <td className="py-2 text-gray-500">Coordenadas</td>
                    <td className="py-2 font-mono text-xs">{emergency.latitude}, {emergency.longitude}</td>
                  </tr>
                )}
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500">Responsable</td>
                  <td className="py-2">{emergency.assignedTo?.name || 'Sin asignar'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Reporter */}
        {(emergency.reporterName || emergency.reporterPhone) && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Datos del reportante</h3>
            <div className="flex gap-8 text-sm">
              {emergency.reporterName && <div><span className="text-gray-500">Nombre: </span>{emergency.reporterName}</div>}
              {emergency.reporterPhone && <div><span className="text-gray-500">Teléfono: </span>{emergency.reporterPhone}</div>}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Descripción</h3>
          <div className="p-4 bg-gray-50 rounded border border-gray-200 text-sm whitespace-pre-wrap">
            {emergency.description}
          </div>
          {emergency.observations && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded text-sm">
              <span className="font-semibold text-blue-800">Observaciones: </span>
              <span className="text-blue-900">{emergency.observations}</span>
            </div>
          )}
        </div>

        {/* Tasks */}
        {emergency.tasks.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Tareas ({emergency.tasks.length})</h3>
            <table className="w-full text-sm border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Tarea</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Estado</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Responsable</th>
                </tr>
              </thead>
              <tbody>
                {emergency.tasks.map((task) => (
                  <tr key={task.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{task.title}</td>
                    <td className="px-3 py-2">{TASK_STATUS_LABELS[task.status]}</td>
                    <td className="px-3 py-2">{task.assignedTo?.name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Evidences */}
        {emergency.evidences.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Evidencias ({emergency.evidences.length})</h3>
            <div className="grid grid-cols-4 gap-3">
              {emergency.evidences.map((ev) => (
                <div key={ev.id} className="aspect-square rounded overflow-hidden border border-gray-200">
                  <img src={ev.url} alt={ev.originalName} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Closing notes */}
        {emergency.closingNotes && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">Observaciones de cierre</h3>
            <p className="text-green-900 text-sm">{emergency.closingNotes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 pt-6 mt-8 text-xs text-gray-400 flex justify-between">
          <span>AlertaComunal — Sistema de Gestión de Emergencias</span>
          <span>{emergency.code} — {formatDate(new Date())}</span>
        </div>
      </div>
    </>
  )
}
