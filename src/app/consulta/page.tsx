'use client'

import { useState } from 'react'
import { EMERGENCY_TYPE_LABELS, STATUS_LABELS, PRIORITY_LABELS, formatDate } from '@/lib/utils'
import type { EmergencyType, EmergencyStatus, Priority } from '@/types'

interface PublicEmergency {
  code: string
  title: string
  type: EmergencyType
  status: EmergencyStatus
  priority: Priority
  address: string
  sector: string | null
  origin: string
  createdAt: string
  occurredAt: string | null
  closedAt: string | null
  closingNotes: string | null
}

const STATUS_COLORS: Record<EmergencyStatus, string> = {
  NUEVA: 'bg-blue-100 text-blue-800',
  EN_ATENCION: 'bg-yellow-100 text-yellow-800',
  RESUELTA: 'bg-green-100 text-green-800',
  CERRADA: 'bg-gray-100 text-gray-700',
  DESCARTADA: 'bg-red-100 text-red-700',
}

const PRIORITY_COLORS: Record<Priority, string> = {
  BAJA: 'bg-gray-100 text-gray-700',
  MEDIA: 'bg-yellow-100 text-yellow-800',
  ALTA: 'bg-orange-100 text-orange-800',
  CRITICA: 'bg-red-100 text-red-800',
}

export default function ConsultaPage() {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PublicEmergency | null>(null)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) return

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch(`/api/reporte-publico?code=${encodeURIComponent(trimmed)}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'No se pudo consultar el reporte.')
        return
      }

      setResult(json)
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">AlertaComunal</p>
              <p className="text-slate-400 text-xs">Municipalidad</p>
            </div>
          </div>
          <a href="/reportar" className="text-slate-300 hover:text-white text-xs underline">
            Enviar reporte
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Consultar reporte</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Ingrese el código de seguimiento que recibió al enviar su reporte.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="EMG-2026-0001"
              className="form-input flex-1 font-mono uppercase placeholder:normal-case placeholder:font-sans"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Consultar
            </button>
          </form>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-gray-700">{result.code}</span>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PRIORITY_COLORS[result.priority]}`}>
                  {PRIORITY_LABELS[result.priority]}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[result.status]}`}>
                  {STATUS_LABELS[result.status]}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Tipo de emergencia</p>
                <p className="text-gray-900 font-medium">{EMERGENCY_TYPE_LABELS[result.type]}</p>
              </div>

              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Dirección</p>
                <p className="text-gray-900">{result.address}</p>
                {result.sector && <p className="text-gray-500 text-sm">{result.sector}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Fecha de reporte</p>
                  <p className="text-gray-700 text-sm">{formatDate(result.createdAt)}</p>
                </div>
                {result.occurredAt && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Fecha del incidente</p>
                    <p className="text-gray-700 text-sm">{formatDate(result.occurredAt)}</p>
                  </div>
                )}
              </div>

              {result.closedAt && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Fecha de cierre</p>
                  <p className="text-gray-700 text-sm">{formatDate(result.closedAt)}</p>
                </div>
              )}

              {result.closingNotes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Nota de cierre</p>
                  <p className="text-gray-700 text-sm">{result.closingNotes}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                Origen: {result.origin === 'CIUDADANO' ? 'Reporte ciudadano' : 'Ingreso interno'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            ¿No tiene código?{' '}
            <a href="/reportar" className="text-blue-600 hover:underline">
              Envíe un reporte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
