'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import type { Emergency, Priority } from '@/types'
import { PRIORITY_LABELS, STATUS_LABELS, EMERGENCY_TYPE_LABELS } from '@/lib/utils'

// Fix Leaflet default icon issue in Next.js
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  })
}

const priorityColors: Record<Priority, string> = {
  BAJA: '#22c55e',
  MEDIA: '#f59e0b',
  ALTA: '#f97316',
  CRITICA: '#ef4444',
}

const createMarkerIcon = (priority: Priority) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background-color: ${priorityColors[priority]};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  })

interface EmergencyMapProps {
  emergencies: Emergency[]
  height?: string
  center?: [number, number]
  zoom?: number
}

export default function EmergencyMap({
  emergencies,
  height = '500px',
  center = [-33.4569, -70.6483],
  zoom = 12,
}: EmergencyMapProps) {
  useEffect(() => {
    fixLeafletIcons()
  }, [])

  const withCoords = emergencies.filter(
    (e) => e.latitude != null && e.longitude != null
  )

  return (
    <div style={{ height }} className="w-full rounded-lg overflow-hidden border border-gray-200">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {withCoords.map((emergency) => (
          <Marker
            key={emergency.id}
            position={[emergency.latitude!, emergency.longitude!]}
            icon={createMarkerIcon(emergency.priority)}
          >
            <Popup maxWidth={280}>
              <div className="text-sm">
                <p className="font-mono text-xs text-gray-500 mb-1">{emergency.code}</p>
                <p className="font-semibold text-gray-900 mb-2">{emergency.title}</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p><span className="font-medium">Tipo:</span> {EMERGENCY_TYPE_LABELS[emergency.type]}</p>
                  <p><span className="font-medium">Estado:</span> {STATUS_LABELS[emergency.status]}</p>
                  <p>
                    <span className="font-medium">Prioridad:</span>{' '}
                    <span style={{ color: priorityColors[emergency.priority] }} className="font-semibold">
                      {PRIORITY_LABELS[emergency.priority]}
                    </span>
                  </p>
                  <p><span className="font-medium">Dirección:</span> {emergency.address}</p>
                </div>
                <div className="mt-3">
                  <Link
                    href={`/emergencias/${emergency.id}`}
                    className="text-blue-600 hover:underline text-xs font-medium"
                  >
                    Ver detalle →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
