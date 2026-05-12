'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const MiniMap = dynamic(() => import('./MiniMap'), {
  ssr: false,
  loading: () => <div className="h-[200px] rounded-lg border border-gray-200 bg-gray-100 animate-pulse" />,
})

export interface Coords {
  lat: number
  lng: number
}

interface Suggestion {
  lat: number
  lng: number
  display: string
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

function parseResults(data: unknown[]): Suggestion[] {
  return (data as { lat: string; lon: string; display_name: string }[]).map((item) => ({
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    display: item.display_name.split(',').slice(0, 4).join(','),
  }))
}

async function searchAddress(
  street: string,
  commune?: string,
  region?: string,
): Promise<Suggestion[]> {
  const headers = { 'User-Agent': 'AlertaComunal/1.0' }

  // Búsqueda estructurada cuando hay contexto geográfico — mucho más precisa
  if (commune || region) {
    const params = new URLSearchParams({
      street,
      format: 'json',
      limit: '5',
      'accept-language': 'es',
      countrycodes: 'cl',
    })
    if (commune) params.set('city', commune)
    if (region) params.set('state', region)

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { headers },
    )
    const data = await res.json()
    if ((data as unknown[]).length > 0) return parseResults(data)

    // Sin resultados estructurados → fallback a texto libre con contexto
    const fallback = [street, commune, region, 'Chile'].filter(Boolean).join(', ')
    const res2 = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fallback)}&format=json&limit=5&accept-language=es&countrycodes=cl`,
      { headers },
    )
    return parseResults(await res2.json())
  }

  // Sin contexto → búsqueda libre
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(street)}&format=json&limit=5&accept-language=es&countrycodes=cl`,
    { headers },
  )
  return parseResults(await res.json())
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json&accept-language=es`
  const res = await fetch(url, { headers: { 'User-Agent': 'AlertaComunal/1.0' } })
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
  placeholder = 'Av. Principal 1234, Santiago',
  commune,
  region,
}: LocationPickerProps) {
  const [geocoding, setGeocoding] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)

  const contextHint = [commune, region].filter(Boolean).join(', ') || undefined

  const handleSearch = async () => {
    if (!address.trim()) return
    setGeocoding(true)
    setMessage(null)
    setSuggestions([])
    try {
      const results = await searchAddress(address.trim(), commune, region)
      if (results.length === 0) {
        setMessage({ text: 'No se encontró la dirección. Agrega la comuna o ciudad.', ok: false })
      } else if (results.length === 1) {
        onCoordsChange({ lat: results[0].lat, lng: results[0].lng })
        setMessage({ text: `Ubicado: ${results[0].display}`, ok: true })
      } else {
        setSuggestions(results)
        setMessage({ text: 'Varias coincidencias — selecciona la correcta:', ok: true })
      }
    } catch {
      setMessage({ text: 'Error al buscar la dirección.', ok: false })
    } finally {
      setGeocoding(false)
    }
  }

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setMessage({ text: 'Tu navegador no soporta geolocalización.', ok: false })
      return
    }
    setGpsLoading(true)
    setMessage(null)
    setSuggestions([])
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        onCoordsChange({ lat: latitude, lng: longitude })
        try {
          const addr = await reverseGeocode(latitude, longitude)
          if (addr) {
            onAddressChange(addr)
            setMessage({ text: `Ubicación GPS: ${addr}`, ok: true })
          } else {
            setMessage({ text: `GPS obtenido: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, ok: true })
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
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  const handleSuggestionSelect = (s: Suggestion) => {
    onCoordsChange({ lat: s.lat, lng: s.lng })
    onAddressChange(s.display.split(',').slice(0, 2).join(',').trim())
    setSuggestions([])
    setMessage({ text: `Ubicado: ${s.display}`, ok: true })
  }

  const handleMapMove = async (lat: number, lng: number) => {
    onCoordsChange({ lat, lng })
    try {
      const addr = await reverseGeocode(lat, lng)
      if (addr) {
        onAddressChange(addr)
        setMessage({ text: `Dirección actualizada: ${addr}`, ok: true })
      }
    } catch {
      // silent — coords already updated
    }
  }

  const busy = geocoding || gpsLoading

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div>
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              }
            }}
            className="form-input flex-1"
            placeholder={placeholder}
          />

          {/* Search button */}
          <button
            type="button"
            onClick={handleSearch}
            disabled={busy || !address.trim()}
            title="Buscar coordenadas por texto"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            {geocoding ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            Buscar
          </button>

          {/* GPS button */}
          <button
            type="button"
            onClick={handleGPS}
            disabled={busy}
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
            La búsqueda usará el contexto: <strong>{contextHint}</strong>
          </p>
        )}

        {addressError && <p className="form-error">{addressError}</p>}

        {message && (
          <p className={`text-xs mt-1.5 ${message.ok ? 'text-green-600' : 'text-amber-600'}`}>
            {message.ok ? '✓ ' : '⚠ '}{message.text}
          </p>
        )}

        {/* Suggestions dropdown */}
        {suggestions.length > 0 && (
          <div className="mt-1 border border-gray-200 rounded-md shadow-sm bg-white divide-y divide-gray-100 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSuggestionSelect(s)}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 transition-colors"
              >
                {s.display}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mini-map preview */}
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
