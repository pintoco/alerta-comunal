'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function MunicipalityToggle({ id, active }: { id: string; active: boolean }) {
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(active)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !current }),
      })
      if (res.ok) {
        setCurrent(!current)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        current
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {current ? 'Activa' : 'Inactiva'}
    </button>
  )
}
