'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { EMERGENCY_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils'
import type { EmergencyType, EmergencyStatus, Priority } from '@/types'

export default function EmergencyFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const rawSearchParams = useSearchParams()
  const searchParams = rawSearchParams ?? new URLSearchParams()

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete('page')
      return params.toString()
    },
    [searchParams]
  )

  const handleChange = (name: string, value: string) => {
    router.push(pathname + '?' + createQueryString(name, value))
  }

  const hasFilters = searchParams.get('search') || searchParams.get('status') ||
    searchParams.get('priority') || searchParams.get('type') || searchParams.get('sector')

  return (
    <div className="card p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <input
          type="text"
          placeholder="Buscar código, título, dirección..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="form-input col-span-1 lg:col-span-2"
        />

        <select
          value={searchParams.get('status') || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="form-input"
        >
          <option value="">Todos los estados</option>
          {(Object.keys(STATUS_LABELS) as EmergencyStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={searchParams.get('priority') || ''}
          onChange={(e) => handleChange('priority', e.target.value)}
          className="form-input"
        >
          <option value="">Todas las prioridades</option>
          {(Object.keys(PRIORITY_LABELS) as Priority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>

        <select
          value={searchParams.get('type') || ''}
          onChange={(e) => handleChange('type', e.target.value)}
          className="form-input"
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(EMERGENCY_TYPE_LABELS) as EmergencyType[]).map((t) => (
            <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={() => router.push(pathname ?? '/emergencias')}
            className="text-sm text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
