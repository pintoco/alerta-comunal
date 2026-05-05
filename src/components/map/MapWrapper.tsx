'use client'

import dynamic from 'next/dynamic'
import type { Emergency } from '@/types'

const EmergencyMap = dynamic(() => import('./EmergencyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-lg border border-gray-200" style={{ minHeight: '500px' }}>
      <div className="text-center text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm">Cargando mapa...</p>
      </div>
    </div>
  ),
})

interface MapWrapperProps {
  emergencies: Emergency[]
  height?: string
  center?: [number, number]
  zoom?: number
}

export default function MapWrapper({ emergencies, height, center, zoom }: MapWrapperProps) {
  return <EmergencyMap emergencies={emergencies} height={height} center={center} zoom={zoom} />
}
