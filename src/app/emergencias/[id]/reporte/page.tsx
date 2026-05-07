import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { canAccessEmergency } from '@/lib/tenant'
import {
  EMERGENCY_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUS_LABELS,
  formatDate,
} from '@/lib/utils'
import PrintButtons from '@/components/emergencies/PrintButtons'

export const dynamic = 'force-dynamic'

export default async function ReportePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { id } = await params

  const emergency = await prisma.emergency.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { name: true, email: true } },
      municipality: { select: { name: true, commune: true, region: true } },
      evidences: { orderBy: { createdAt: 'asc' } },
      tasks: {
        include: { assignedTo: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activityLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!emergency) notFound()

  if (!canAccessEmergency(session, emergency.municipalityId)) {
    redirect('/emergencias')
  }

  const municipalityLabel = emergency.municipality?.name
    ? [emergency.municipality.name, emergency.municipality.commune, emergency.municipality.region]
        .filter(Boolean)
        .join(' — ')
    : null

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
        {/* Encabezado institucional */}
        <div className="flex items-start justify-between border-b-2 border-blue-900 pb-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-blue-700 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-blue-900">AlertaComunal</h1>
                <p className="text-gray-500 text-xs">Sistema Municipal de Gestión de Emergencias</p>
                {municipalityLabel && (
                  <p className="text-blue-800 text-xs font-medium mt-0.5">{municipalityLabel}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Reporte de Emergencia</p>
            <p className="text-3xl font-bold font-mono text-blue-900 mt-1">{emergency.code}</p>
            <p className="text-xs text-gray-500 mt-1">Emitido: {formatDate(new Date())}</p>
          </div>
        </div>

        {/* Banner de estado */}
        <div className="flex flex-wrap items-center gap-6 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
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
          <div className="w-px h-10 bg-gray-300" />
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold">Origen</p>
            <p className="font-bold text-lg">{emergency.origin === 'CIUDADANO' ? 'Ciudadano' : 'Interno'}</p>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-xl font-bold text-gray-900 mb-6 border-l-4 border-blue-600 pl-3">
          {emergency.title}
        </h2>

        {/* Datos en dos columnas */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Datos generales
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500 w-2/5">Código</td>
                  <td className="py-2 font-mono font-medium">{emergency.code}</td>
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
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Ubicación y responsable
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 text-gray-500 w-2/5">Dirección</td>
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
                    <td className="py-2 font-mono text-xs">{emergency.latitude.toFixed(5)}, {emergency.longitude.toFixed(5)}</td>
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

        {/* Datos del reportante */}
        {(emergency.reporterName || emergency.reporterPhone) && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Datos del reportante
            </h3>
            <div className="flex gap-8 text-sm">
              {emergency.reporterName && <div><span className="text-gray-500">Nombre: </span>{emergency.reporterName}</div>}
              {emergency.reporterPhone && <div><span className="text-gray-500">Teléfono: </span>{emergency.reporterPhone}</div>}
            </div>
          </div>
        )}

        {/* Descripción */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
            Descripción
          </h3>
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

        {/* Tareas */}
        {emergency.tasks.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Tareas ({emergency.tasks.length})
            </h3>
            <table className="w-full text-sm border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium">Tarea</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium w-28">Estado</th>
                  <th className="text-left px-3 py-2 text-gray-600 font-medium w-32">Responsable</th>
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

        {/* Evidencias */}
        {emergency.evidences.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Evidencias fotográficas ({emergency.evidences.length})
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {emergency.evidences.map((ev) => (
                <div key={ev.id} className="rounded overflow-hidden border border-gray-200 bg-gray-50">
                  <div className="aspect-square">
                    <img src={ev.url} alt={ev.originalName} className="w-full h-full object-cover" />
                  </div>
                  {ev.description && (
                    <p className="text-xs text-gray-500 px-2 py-1 truncate">{ev.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notas de cierre */}
        {emergency.closingNotes && (
          <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="text-xs font-bold uppercase tracking-wide text-green-700 mb-2">
              Observaciones de cierre
            </h3>
            <p className="text-green-900 text-sm">{emergency.closingNotes}</p>
          </div>
        )}

        {/* Historial de actividad */}
        {emergency.activityLogs.length > 0 && (
          <div className="mb-8 page-break">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3 border-b border-gray-200 pb-1">
              Historial de actividad ({emergency.activityLogs.length})
            </h3>
            <div className="space-y-2">
              {emergency.activityLogs.map((log) => (
                <div key={log.id} className="flex gap-3 text-sm border-b border-gray-50 pb-2">
                  <span className="text-gray-400 whitespace-nowrap text-xs pt-0.5 w-36 flex-shrink-0">
                    {formatDate(log.createdAt)}
                  </span>
                  <span className="text-gray-700">{log.description}</span>
                  {log.user && <span className="text-gray-400 text-xs pt-0.5 flex-shrink-0">— {log.user.name}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bloque de firma */}
        <div className="mt-12 pt-8 border-t-2 border-gray-200">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <div className="border-b border-gray-400 mb-3" style={{ paddingBottom: '2.5rem' }}></div>
              <p className="text-xs text-gray-500 text-center font-medium">Firma y Nombre Responsable Municipal</p>
              <p className="text-xs text-gray-400 text-center mt-1">Cargo: ___________________________</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-3" style={{ paddingBottom: '2.5rem' }}></div>
              <p className="text-xs text-gray-500 text-center font-medium">Firma, Nombre y Timbre Unidad</p>
              <p className="text-xs text-gray-400 text-center mt-1">Fecha: ___________________________</p>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="border-t border-gray-200 pt-4 mt-8 text-xs text-gray-400 flex justify-between">
          <span>AlertaComunal — Sistema Municipal de Gestión de Emergencias</span>
          <span>{emergency.code} — Emitido el {formatDate(new Date())}</span>
        </div>
      </div>
    </>
  )
}
