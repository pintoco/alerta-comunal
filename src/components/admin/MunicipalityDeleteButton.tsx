'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface MunicipalityDeleteButtonProps {
  id: string
  /** true si tiene usuarios y/o emergencias asociadas — no se puede eliminar. */
  disabled?: boolean
  disabledReason?: string
}

export default function MunicipalityDeleteButton({ id, disabled, disabledReason }: MunicipalityDeleteButtonProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/admin/municipalidades/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/admin/municipalidades')
      router.refresh()
    } else {
      const b = await res.json()
      setError(b.error ?? 'Error al eliminar')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (disabled) {
    return (
      <span
        className="text-gray-300 text-xs cursor-not-allowed"
        title={disabledReason ?? 'No se puede eliminar: tiene usuarios o emergencias asociadas'}
      >
        Eliminar
      </span>
    )
  }

  if (error) {
    return (
      <span className="text-xs text-red-500">
        {error}{' '}
        <button onClick={() => setError(null)} className="underline">OK</button>
      </span>
    )
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-gray-500">¿Eliminar?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-red-600 hover:underline font-medium disabled:opacity-50"
        >
          {loading ? '…' : 'Sí'}
        </button>
        <span className="text-gray-300">·</span>
        <button onClick={() => setConfirming(false)} className="text-gray-500 hover:underline">
          No
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-red-500 hover:text-red-700 hover:underline text-xs"
    >
      Eliminar
    </button>
  )
}
