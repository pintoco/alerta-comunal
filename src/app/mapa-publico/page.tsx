'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { EMERGENCY_TYPE_LABELS, STATUS_LABELS } from '@/lib/utils'
import type { Emergency } from '@/types'

const MapWrapper = dynamic(() => import('@/components/map/MapWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200" style={{ height: '500px' }}>
      <div className="text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

export default function MapaPublicoPage() {
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/mapa-publico')
      .then((r) => {
        if (!r.ok) throw new Error()
        return r.json()
      })
      .then((data) => {
        setEmergencies(data)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [])

  const activas = emergencies.filter((e) => e.status === 'NUEVA' || e.status === 'EN_ATENCION')
  const enAtencion = emergencies.filter((e) => e.status === 'EN_ATENCION').length
  const nuevas = emergencies.filter((e) => e.status === 'NUEVA').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-slate-900 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">AlertaComunal</p>
              <p className="text-slate-400 text-xs">Mapa de emergencias activas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <a href="/reportar" className="text-slate-300 hover:text-white underline">
              Reportar emergencia
            </a>
            <a href="/consulta" className="text-slate-300 hover:text-white underline">
              Consultar reporte
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Emergencias activas</h1>
          <p className="text-gray-500 text-sm mt-1">
            Mapa en tiempo real de situaciones comunales con atención activa.
          </p>
        </div>

        {!loading && !error && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{emergencies.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total activas</p>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{nuevas}</p>
              <p className="text-xs text-blue-600 mt-1">Nuevas</p>
            </div>
            <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{enAtencion}</p>
              <p className="text-xs text-yellow-600 mt-1">En atención</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 text-xs flex-wrap">
          <span className="text-gray-500 font-medium">Prioridad:</span>
          {[
            { color: 'bg-green-500', label: 'Baja' },
            { color: 'bg-yellow-500', label: 'Media' },
            { color: 'bg-orange-500', label: 'Alta' },
            { color: 'bg-red-500', label: 'Crítica' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded-full ${item.color}`} />
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center h-64 text-gray-400 text-sm gap-2">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Cargando emergencias...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            No se pudieron cargar las emergencias. Intente recargar la página.
          </div>
        )}

        {!loading && !error && emergencies.length === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
            <svg className="w-10 h-10 text-green-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold text-green-800">Sin emergencias activas</p>
            <p className="text-green-600 text-sm mt-1">No hay situaciones registradas en este momento.</p>
          </div>
        )}

        {!loading && !error && emergencies.length > 0 && (
          <MapWrapper
            emergencies={emergencies as unknown as Emergency[]}
            height="520px"
          />
        )}

        {!loading && !error && emergencies.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Listado de emergencias activas</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {emergencies.map((em) => (
                <div key={em.id} className="px-5 py-3 flex items-start justify-between gap-4 text-sm hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-400">{em.code}</span>
                      <span className="font-medium text-gray-900 truncate">{em.title}</span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5 truncate">
                      {EMERGENCY_TYPE_LABELS[em.type]} · {em.address}
                      {em.sector ? ` · ${em.sector}` : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-xs">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full font-medium ${
                        em.status === 'NUEVA'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {STATUS_LABELS[em.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-4">
          Solo se muestran emergencias activas con coordenadas registradas.
          Para reportar una nueva emergencia{' '}
          <a href="/reportar" className="text-blue-500 hover:underline">haga clic aquí</a>.
        </p>
      </div>
    </div>
  )
}
