'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface ClosingReason {
  id: string
  label: string
  active: boolean
  order: number
}

export default function MotivosCierrePage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [reasons, setReasons] = useState<ClosingReason[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function load() {
    fetch(`/api/admin/municipalidades/${id}/motivos-cierre`)
      .then((r) => r.json())
      .then((data: ClosingReason[]) => setReasons(data))
      .catch(() => setError('Error al cargar los motivos de cierre'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  async function handleAdd() {
    if (!newLabel.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/motivos-cierre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al agregar')
      }
      const created: ClosingReason = await res.json()
      setReasons((prev) => [...prev, created])
      setNewLabel('')
      setSuccess('Motivo agregado.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(reason: ClosingReason) {
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/motivos-cierre/${reason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !reason.active }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al actualizar')
      }
      const updated: ClosingReason = await res.json()
      setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  async function handleRename(reason: ClosingReason, label: string) {
    if (!label.trim() || label === reason.label) return
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/motivos-cierre/${reason.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al renombrar')
      }
      const updated: ClosingReason = await res.json()
      setReasons((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al renombrar')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-blue-600">Administración</Link>
          <span>›</span>
          <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
          <span>›</span>
          <Link href={`/admin/municipalidades/${id}`} className="hover:text-blue-600">Detalle</Link>
          <span>›</span>
          <span>Motivos de cierre</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motivos de cierre</h1>
          <p className="text-sm text-gray-500 mt-1">
            Se piden al cerrar una emergencia, junto a las observaciones de cierre. Desactivar
            un motivo no afecta a las emergencias que ya lo usaron.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card">
            <div className="divide-y divide-gray-100">
              {reasons.map((reason) => (
                <div key={reason.id} className="flex items-center gap-3 px-5 py-3">
                  <input
                    className="form-input flex-1"
                    defaultValue={reason.label}
                    onBlur={(e) => handleRename(reason, e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={reason.active}
                      onChange={() => handleToggleActive(reason)}
                    />
                    Activo
                  </label>
                </div>
              ))}
              {reasons.length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">Sin motivos configurados.</p>
              )}
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100">
              <input
                className="form-input flex-1"
                placeholder="Nuevo motivo de cierre..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
              <Button type="button" size="sm" loading={saving} onClick={handleAdd}>
                Agregar
              </Button>
            </div>
          </div>
        )}

        <Button variant="secondary" type="button" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    </div>
  )
}
