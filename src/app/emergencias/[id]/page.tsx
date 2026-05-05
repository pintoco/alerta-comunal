'use client'

export const dynamic = 'force-dynamic'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Emergency, Task, Evidence, User } from '@/types'
import {
  EMERGENCY_TYPE_LABELS,
  STATUS_LABELS,
  PRIORITY_LABELS,
  formatDate,
  formatDateShort,
} from '@/lib/utils'
import StatusBadge from '@/components/emergencies/StatusBadge'
import PriorityBadge from '@/components/emergencies/PriorityBadge'
import TaskList from '@/components/emergencies/TaskList'
import EvidenceGallery from '@/components/emergencies/EvidenceGallery'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Loading from '@/components/ui/Loading'

interface ActivityLog {
  id: string
  action: string
  description: string
  createdAt: string
  user?: { name: string } | null
}

export default function EmergenciaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [emergency, setEmergency] = useState<Emergency | null>(null)
  const [users, setUsers] = useState<Pick<User, 'id' | 'name'>[]>([])
  const [session, setSession] = useState<{ role: string; id: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [closingNotes, setClosingNotes] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/emergencias/${id}`).then((r) => r.json()),
      fetch('/api/usuarios').then((r) => r.json()),
      fetch('/api/auth/me').then((r) => r.json()),
    ]).then(([em, us, sess]) => {
      setEmergency(em)
      setUsers(us)
      setSession(sess)
      setNewStatus(em.status)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleStatusUpdate = async () => {
    setStatusLoading(true)
    try {
      const res = await fetch(`/api/emergencias/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, closingNotes }),
      })
      if (res.ok) {
        const updated = await res.json()
        setEmergency((prev) => prev ? { ...prev, status: updated.status, closedAt: updated.closedAt, closingNotes: updated.closingNotes } : prev)
        setShowStatusModal(false)
      }
    } finally {
      setStatusLoading(false)
    }
  }

  if (loading) return (
    <div className="flex h-screen items-center justify-center">
      <Loading text="Cargando emergencia..." />
    </div>
  )

  if (!emergency || emergency.id === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Emergencia no encontrada.</p>
          <Link href="/emergencias" className="btn-primary text-sm">Volver al listado</Link>
        </div>
      </div>
    )
  }

  const canEdit = session?.role === 'ADMIN' || session?.role === 'OPERADOR'
  const activityLogs = (emergency as any).activityLogs as ActivityLog[] || []
  const evidences = emergency.evidences || []
  const tasks = emergency.tasks || []

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <div className="flex-1 overflow-auto">
        {/* Fake header since this is client component */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Link href="/emergencias" className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="font-mono text-xs text-gray-400">{emergency.code}</span>
            <StatusBadge status={emergency.status} />
            <PriorityBadge priority={emergency.priority} />
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/emergencias/${id}/reporte`} target="_blank" className="btn-secondary text-sm inline-flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Generar reporte
            </Link>
            {canEdit && (
              <>
                <Button variant="secondary" size="sm" onClick={() => setShowStatusModal(true)}>
                  Cambiar estado
                </Button>
                <Link href={`/emergencias/${id}/editar`} className="btn-primary text-sm inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{emergency.title}</h1>
            <p className="text-gray-500 mt-1">{EMERGENCY_TYPE_LABELS[emergency.type]}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Descripción</h2>
                <p className="text-gray-900 whitespace-pre-wrap">{emergency.description}</p>
                {emergency.observations && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Observaciones</p>
                    <p className="text-gray-700 text-sm">{emergency.observations}</p>
                  </div>
                )}
              </div>

              <div className="card p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Evidencias fotográficas ({evidences.length})
                </h2>
                <EvidenceGallery
                  evidences={evidences}
                  emergencyId={id}
                  canUpload={canEdit}
                  onUpload={(ev) => setEmergency((prev) => prev ? { ...prev, evidences: [ev, ...(prev.evidences || [])] } : prev)}
                  onDelete={(eid) => setEmergency((prev) => prev ? { ...prev, evidences: (prev.evidences || []).filter((e) => e.id !== eid) } : prev)}
                />
              </div>

              <div className="card p-6">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                  Tareas ({tasks.length})
                </h2>
                <TaskList
                  tasks={tasks}
                  emergencyId={id}
                  canEdit={canEdit}
                  users={users}
                  onTaskAdded={(t) => setEmergency((prev) => prev ? { ...prev, tasks: [...(prev.tasks || []), t] } : prev)}
                  onTaskUpdated={(t) => setEmergency((prev) => prev ? { ...prev, tasks: (prev.tasks || []).map((tt) => tt.id === t.id ? t : tt) } : prev)}
                  onTaskDeleted={(tid) => setEmergency((prev) => prev ? { ...prev, tasks: (prev.tasks || []).filter((t) => t.id !== tid) } : prev)}
                />
              </div>

              {activityLogs.length > 0 && (
                <div className="card p-6">
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Historial de actividad</h2>
                  <div className="space-y-3">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-700">{log.description}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatDate(log.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar info */}
            <div className="space-y-4">
              <div className="card p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Información</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-gray-500">Código</dt>
                    <dd className="font-mono font-medium text-gray-900">{emergency.code}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Estado</dt>
                    <dd><StatusBadge status={emergency.status} /></dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Prioridad</dt>
                    <dd><PriorityBadge priority={emergency.priority} /></dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Tipo</dt>
                    <dd className="text-gray-900">{EMERGENCY_TYPE_LABELS[emergency.type]}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Origen</dt>
                    <dd className="text-gray-900">{emergency.origin === 'CIUDADANO' ? 'Ciudadano' : 'Interno'}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ubicación</h2>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Dirección</dt>
                    <dd className="text-gray-900">{emergency.address}</dd>
                  </div>
                  {emergency.sector && (
                    <div>
                      <dt className="text-gray-500">Sector</dt>
                      <dd className="text-gray-900">{emergency.sector}</dd>
                    </div>
                  )}
                  {emergency.latitude && emergency.longitude && (
                    <div>
                      <dt className="text-gray-500">Coordenadas</dt>
                      <dd className="text-gray-900 font-mono text-xs">
                        {emergency.latitude.toFixed(6)}, {emergency.longitude.toFixed(6)}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="card p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Reportante</h2>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Nombre</dt>
                    <dd className="text-gray-900">{emergency.reporterName || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Teléfono</dt>
                    <dd className="text-gray-900">{emergency.reporterPhone || '—'}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Responsable</h2>
                {emergency.assignedTo ? (
                  <p className="text-gray-900 text-sm font-medium">{emergency.assignedTo.name}</p>
                ) : (
                  <p className="text-gray-400 text-sm">Sin asignar</p>
                )}
              </div>

              <div className="card p-5">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Fechas</h2>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500">Creación</dt>
                    <dd className="text-gray-900">{formatDate(emergency.createdAt)}</dd>
                  </div>
                  {emergency.occurredAt && (
                    <div>
                      <dt className="text-gray-500">Ocurrencia</dt>
                      <dd className="text-gray-900">{formatDate(emergency.occurredAt)}</dd>
                    </div>
                  )}
                  {emergency.closedAt && (
                    <div>
                      <dt className="text-gray-500">Cierre</dt>
                      <dd className="text-gray-900">{formatDate(emergency.closedAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {emergency.closingNotes && (
                <div className="card p-5 border-green-200 bg-green-50">
                  <h2 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Observaciones de cierre</h2>
                  <p className="text-green-800 text-sm">{emergency.closingNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showStatusModal} onClose={() => setShowStatusModal(false)} title="Cambiar estado" size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Nuevo estado</label>
            <select
              className="form-input"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {(newStatus === 'CERRADA' || newStatus === 'RESUELTA') && (
            <div>
              <label className="form-label">Observaciones de cierre</label>
              <textarea
                className="form-input"
                rows={3}
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Descripción de cómo se resolvió la emergencia..."
              />
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowStatusModal(false)}>Cancelar</Button>
            <Button onClick={handleStatusUpdate} loading={statusLoading}>Guardar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
