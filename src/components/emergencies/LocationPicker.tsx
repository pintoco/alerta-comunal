'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

const MiniMap = dynamic(() => import('./MiniMap'), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />,
})

export interface Coords {
  lat: number
  lng: number
}

interface LocationPickerProps {
  address: string
  onAddressChange: (v: string) => void
  coords: Coords | null
  onCoordsChange: (v: Coords | null) => void
  addressError?: string
  placeholder?: string
  commune?: string
  region?: string
}

let mapsConfigured = false
function configureMaps() {
  if (mapsConfigured) return
  setOptions({
    key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    v: 'weekly',
    language: 'es',
    region: 'CL',
  })
  mapsConfigured = true
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`,
    { headers: { 'User-Agent': 'AlertaComunal/1.0' } },
  )
  const data = await res.json()
  if (data.error) return null
  const a = data.address as Record<string, string>
  const parts = [
    a.road ? `${a.road}${a.house_number ? ' ' + a.house_number : ''}` : null,
    a.suburb || a.neighbourhood || null,
    a.city || a.town || a.village || a.municipality || null,
  ].filter(Boolean)
  return parts.length > 0
    ? parts.join(', ')
    : (data.display_name as string).split(',').slice(0, 3).join(',')
}

export default function LocationPicker({
  address,
  onAddressChange,
  coords,
  onCoordsChange,
  addressError,
  placeholder = 'Av. Principal 1234',
  commune,
  region,
}: LocationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [ready, setReady] = useState(false)

  const contextHint = [commune, region].filter(Boolean).join(', ') || undefined

  // Cargar Google Maps Places y crear Autocomplete
  useEffect(() => {
    if (!inputRef.current || autocompleteRef.current) return
    const input = inputRef.current

    configureMaps()
    importLibrary('places')
      .then((places) => {
        const { Autocomplete } = places as google.maps.PlacesLibrary
        const ac = new Autocomplete(input, {
          componentRestrictions: { country: 'cl' },
          fields: ['geometry', 'formatted_address'],
          types: ['address'],
        })
        ac.addListener('place_changed', () => {
          const place = ac.getPlace()
          if (!place.geometry?.location) {
            setMessage({ text: 'Selecciona una opción de la lista desplegable.', ok: false })
            return
          }
          const lat = place.geometry.location.lat()
          const lng = place.geometry.location.lng()
          onCoordsChange({ lat, lng })
          onAddressChange(place.formatted_address ?? input.value ?? '')
          setMessage({ text: 'Dirección geocodificada correctamente.', ok: true })
        })
        autocompleteRef.current = ac
        setReady(true)
      })
      .catch(() => { /* degrada sin autocompletado */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setMessage({ text: 'Tu navegador no soporta geolocalización.', ok: false })
      return
    }
    setGpsLoading(true)
    setMessage(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        onCoordsChange({ lat: latitude, lng: longitude })
        try {
          const addr = await reverseGeocode(latitude, longitude)
          if (addr) {
            onAddressChange(addr)
            setMessage({ text: `GPS: ${addr}`, ok: true })
          } else {
            setMessage({ text: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, ok: true })
          }
        } catch {
          setMessage({ text: `Coordenadas: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, ok: true })
        }
        setGpsLoading(false)
      },
      (err) => {
        setGpsLoading(false)
        const msgs: Record<number, string> = {
          1: 'Permiso de ubicación denegado. Habilítalo en el navegador.',
          2: 'No se pudo obtener la ubicación.',
          3: 'Tiempo de espera agotado.',
        }
        setMessage({ text: msgs[err.code] || 'Error al obtener ubicación.', ok: false })
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    )
  }

  const handleMapMove = async (lat: number, lng: number) => {
    onCoordsChange({ lat, lng })
    try {
      const addr = await reverseGeocode(lat, lng)
      if (addr) {
        onAddressChange(addr)
        setMessage({ text: `Dirección: ${addr}`, ok: true })
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="form-input flex-1"
            placeholder={ready ? `${placeholder} — escribe para buscar` : placeholder}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={handleGPS}
            disabled={gpsLoading}
            title="Usar mi ubicación actual (GPS)"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {gpsLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0-6C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
              </svg>
            )}
            GPS
          </button>
        </div>

        {contextHint && (
          <p className="text-xs text-blue-600 mt-1">
            Contexto activo: <strong>{contextHint}</strong>
          </p>
        )}

        {addressError && <p className="form-error">{addressError}</p>}

        {message && (
          <p className={`text-xs mt-1.5 ${message.ok ? 'text-green-600' : 'text-amber-600'}`}>
            {message.ok ? '✓ ' : '⚠ '}{message.text}
          </p>
        )}
      </div>

      {coords && (
        <div>
          <p className="text-xs text-gray-400 mb-1">
            {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} —{' '}
            <span>arrastra el pin o haz clic en el mapa para ajustar</span>
          </p>
          <MiniMap lat={coords.lat} lng={coords.lng} onMove={handleMapMove} />
        </div>
      )}
    </div>
  )
}
