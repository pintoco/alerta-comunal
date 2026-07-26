'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface EmergencyCategory {
  id: string
  label: string
  active: boolean
  order: number
}

export default function CategoriasEmergenciaPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [categories, setCategories] = useState<EmergencyCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [newLabel, setNewLabel] = useState('')

  function load() {
    fetch(`/api/admin/municipalidades/${id}/categorias`)
      .then((r) => r.json())
      .then((data: EmergencyCategory[]) => setCategories(data))
      .catch(() => setError('Error al cargar las categorías de emergencia'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  async function handleAdd() {
    if (!newLabel.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newLabel.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al agregar')
      }
      const created: EmergencyCategory = await res.json()
      setCategories((prev) => [...prev, created])
      setNewLabel('')
      setSuccess('Categoría agregada.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al agregar')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(category: EmergencyCategory) {
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/categorias/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !category.active }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al actualizar')
      }
      const updated: EmergencyCategory = await res.json()
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar')
    }
  }

  async function handleRename(category: EmergencyCategory, label: string) {
    if (!label.trim() || label === category.label) return
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/categorias/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim() }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al renombrar')
      }
      const updated: EmergencyCategory = await res.json()
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
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
          <span>Categorías de emergencia</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías de emergencia</h1>
          <p className="text-sm text-gray-500 mt-1">
            Se usan al registrar o editar una emergencia, y en el formulario ciudadano
            de esta municipalidad. Desactivar una categoría no afecta a las emergencias
            que ya la usaron.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card">
            <div className="divide-y divide-gray-100">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center gap-3 px-5 py-3">
                  <input
                    className="form-input flex-1"
                    defaultValue={category.label}
                    onBlur={(e) => handleRename(category, e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={category.active}
                      onChange={() => handleToggleActive(category)}
                    />
                    Activo
                  </label>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">Sin categorías configuradas.</p>
              )}
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-100">
              <input
                className="form-input flex-1"
                placeholder="Nueva categoría de emergencia..."
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
