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

  const hasFilters =
    searchParams.get('search') ||
    searchParams.get('status') ||
    searchParams.get('priority') ||
    searchParams.get('type') ||
    searchParams.get('sector') ||
    searchParams.get('desde') ||
    searchParams.get('hasta')

  const buildExportUrl = () => {
    const params = new URLSearchParams(searchParams.toString())
    return `/api/emergencias/export?${params.toString()}`
  }

  return (
    <div className="card p-4 mb-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Buscar código, título, dirección..."
          defaultValue={searchParams.get('search') || ''}
          onChange={(e) => handleChange('search', e.target.value)}
          className="form-input xl:col-span-2"
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

        <input
          type="text"
          placeholder="Filtrar por sector..."
          defaultValue={searchParams.get('sector') || ''}
          onChange={(e) => handleChange('sector', e.target.value)}
          className="form-input"
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Desde</label>
          <input
            type="date"
            value={searchParams.get('desde') || ''}
            onChange={(e) => handleChange('desde', e.target.value)}
            className="form-input"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500 font-medium">Hasta</label>
          <input
            type="date"
            value={searchParams.get('hasta') || ''}
            onChange={(e) => handleChange('hasta', e.target.value)}
            className="form-input"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <a
          href={buildExportUrl()}
          className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Exportar CSV
        </a>

        {hasFilters && (
          <button
            onClick={() => router.push(pathname ?? '/emergencias')}
            className="text-sm text-blue-600 hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  )
}
