'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'

export default function EmergencyDeleteButton({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/emergencias/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/emergencias')
      router.refresh()
    } else {
      const b = await res.json().catch(() => ({}))
      setError(b.error ?? 'Error al eliminar')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (error) {
    return (
      <span className="text-xs text-red-500 inline-flex items-center gap-1">
        {error}
        <button onClick={() => setError(null)} className="underline">OK</button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2 text-sm">
        <span className="text-gray-500">¿Eliminar esta emergencia? No se puede deshacer.</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-600 hover:underline font-medium disabled:opacity-50"
        >
          {loading ? 'Eliminando…' : 'Sí, eliminar'}
        </button>
        <span className="text-gray-300">·</span>
        <button onClick={() => setConfirming(false)} className="text-gray-500 hover:underline">
          Cancelar
        </button>
      </span>
    )
  }

  return (
    <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
      Eliminar
    </Button>
  )
}
