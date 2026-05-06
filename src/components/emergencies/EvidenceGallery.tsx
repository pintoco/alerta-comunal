'use client'

import { useState, useRef } from 'react'
import type { Evidence } from '@/types'
import { formatFileSize, formatDate } from '@/lib/utils'
import Button from '@/components/ui/Button'

interface EvidenceGalleryProps {
  evidences: Evidence[]
  emergencyId: string
  canUpload: boolean
  onUpload?: (evidence: Evidence) => void
  onDelete?: (id: string) => void
}

export default function EvidenceGallery({
  evidences,
  emergencyId,
  canUpload,
  onUpload,
  onDelete,
}: EvidenceGalleryProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Evidence | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/emergencias/${emergencyId}/evidencias`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al subir imagen')
      }

      const evidence = await res.json()
      onUpload?.(evidence)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta evidencia?')) return
    try {
      const res = await fetch(`/api/emergencias/${emergencyId}/evidencias?evidenceId=${id}`, {
        method: 'DELETE',
      })
      if (res.ok) onDelete?.(id)
    } catch {
      setError('Error al eliminar evidencia')
    }
  }

  return (
    <div>
      {canUpload && (
        <div className="mb-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            id="evidence-upload"
          />
          <label htmlFor="evidence-upload">
            <Button
              variant="secondary"
              size="sm"
              loading={uploading}
              className="cursor-pointer"
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Subir imagen
            </Button>
          </label>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </div>
      )}

      {evidences.length === 0 ? (
        <div className="text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm">No hay evidencias fotográficas</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {evidences.map((ev) => (
            <div key={ev.id} className="relative group rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-100">
              <img
                src={ev.url}
                alt={ev.originalName}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelected(ev)}
                onError={(e) => {
                  const img = e.currentTarget
                  img.style.display = 'none'
                  const placeholder = img.nextElementSibling as HTMLElement | null
                  if (placeholder) placeholder.style.display = 'flex'
                }}
              />
              <div className="absolute inset-0 hidden flex-col items-center justify-center text-gray-400 text-xs text-center p-2 bg-gray-100">
                <svg className="w-8 h-8 mb-1 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Imagen no disponible
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end justify-between p-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setSelected(ev)}
                  className="text-white bg-black/50 rounded px-2 py-1 text-xs"
                >
                  Ver
                </button>
                {canUpload && (
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="text-white bg-red-500/80 rounded px-2 py-1 text-xs"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 border-b flex justify-between items-center">
              <div>
                <p className="font-medium text-sm text-gray-900">{selected.originalName}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selected.size)} · {formatDate(selected.createdAt)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img
              src={selected.url}
              alt={selected.originalName}
              className="w-full max-h-[70vh] object-contain"
              onError={(e) => {
                e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect width='400' height='200' fill='%23f3f4f6'/%3E%3Ctext x='200' y='110' font-size='14' text-anchor='middle' fill='%239ca3af' font-family='sans-serif'%3EImagen no disponible%3C/text%3E%3C/svg%3E"
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
