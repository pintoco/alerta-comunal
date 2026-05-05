'use client'

import { useState } from 'react'
import type { Task, User } from '@/types'
import { TASK_STATUS_LABELS, formatDateShort } from '@/lib/utils'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

interface TaskListProps {
  tasks: Task[]
  emergencyId: string
  canEdit: boolean
  users: Pick<User, 'id' | 'name'>[]
  onTaskAdded?: (task: Task) => void
  onTaskUpdated?: (task: Task) => void
  onTaskDeleted?: (id: string) => void
}

const statusColors: Record<string, string> = {
  PENDIENTE: 'bg-gray-100 text-gray-700',
  EN_PROCESO: 'bg-yellow-100 text-yellow-700',
  COMPLETADA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-700',
}

export default function TaskList({
  tasks,
  emergencyId,
  canEdit,
  users,
  onTaskAdded,
  onTaskUpdated,
  onTaskDeleted,
}: TaskListProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', assignedToId: '', dueDate: '' })

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/emergencias/${emergencyId}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          assignedToId: form.assignedToId || null,
          dueDate: form.dueDate || null,
        }),
      })
      if (!res.ok) throw new Error('Error al crear tarea')
      const task = await res.json()
      onTaskAdded?.(task)
      setShowModal(false)
      setForm({ title: '', description: '', assignedToId: '', dueDate: '' })
    } catch {
      setError('Error al crear la tarea')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      const res = await fetch(`/api/emergencias/${emergencyId}/tareas/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) return
      const task = await res.json()
      onTaskUpdated?.(task)
    } catch {
      /* silent */
    }
  }

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      const res = await fetch(`/api/emergencias/${emergencyId}/tareas/${taskId}`, {
        method: 'DELETE',
      })
      if (res.ok) onTaskDeleted?.(taskId)
    } catch {
      /* silent */
    }
  }

  return (
    <div>
      {canEdit && (
        <div className="mb-4">
          <Button variant="secondary" size="sm" onClick={() => setShowModal(true)}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva tarea
          </Button>
        </div>
      )}

      {tasks.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-6">No hay tareas asignadas.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm text-gray-900">{task.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                </div>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-1">{task.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                  {task.assignedTo && <span>Responsable: {task.assignedTo.name}</span>}
                  {task.dueDate && <span>Vence: {formatDateShort(task.dueDate)}</span>}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    className="text-xs border border-gray-200 rounded px-1 py-0.5"
                  >
                    <option value="PENDIENTE">Pendiente</option>
                    <option value="EN_PROCESO">En proceso</option>
                    <option value="COMPLETADA">Completada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nueva tarea" size="sm">
        <div className="space-y-4">
          <div>
            <label className="form-label">Título *</label>
            <input
              className="form-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Descripción de la tarea"
            />
          </div>
          <div>
            <label className="form-label">Detalle</label>
            <textarea
              className="form-input"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instrucciones adicionales..."
            />
          </div>
          <div>
            <label className="form-label">Responsable</label>
            <select
              className="form-input"
              value={form.assignedToId}
              onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Fecha límite</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleCreate} loading={loading}>Crear tarea</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
