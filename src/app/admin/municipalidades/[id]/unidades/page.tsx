'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface OperationalUnit {
  id: string
  label: string
  active: boolean
  order: number
}

export default function UnidadesOperacionalesPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [units, setUnits] = useState<OperationalUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function load() {
    fetch(`/api/admin/municipalidades/${id}/unidades`)
      .then((r) => r.json())
      .then((data: OperationalUnit[]) => setUnits(data))
      .catch(() => setError('Error al cargar las unidades operacionales'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  async function handleAdd() {
    if (!newLabel.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/unidades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al agregar')
      }
      const created: OperationalUnit = await res.json()
      setUnits((prev) => [...prev, created])
      setNewLabel('')
      setSuccess('Unidad agregada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(unit: OperationalUnit) {
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/unidades/${unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !unit.active }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al actualizar')
      }
      const updated: OperationalUnit = await res.json()
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  async function handleRename(unit: OperationalUnit, label: string) {
    if (!label.trim() || label === unit.label) return
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/unidades/${unit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al renombrar')
      }
      const updated: OperationalUnit = await res.json()
      setUnits((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
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
          <span>Unidades operacionales</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Unidades operacionales</h1>
          <p className="text-sm text-gray-500 mt-1">
            Etiqueta organizativa opcional para agrupar usuarios (ej. Bomberos, Obras
            Públicas). Solo informativa — no cambia permisos ni asignación de emergencias.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card">
            <div className="divide-y divide-gray-100">
              {units.map((unit) => (
                <div key={unit.id} className="flex items-center gap-3 px-5 py-3">
                  <input
                    className="form-input flex-1"
                    defaultValue={unit.label}
                    onBlur={(e) => handleRename(unit, e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={unit.active}
                      onChange={() => handleToggleActive(unit)}
                    />
                    Activo
                  </label>
                </div>
              ))}
              {units.length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">
                  Aún no hay unidades operacionales. Agrega la primera abajo.
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100">
              <input
                className="form-input flex-1"
                placeholder="Nueva unidad operacional..."
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
