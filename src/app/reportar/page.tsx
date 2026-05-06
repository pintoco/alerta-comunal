'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { publicReportSchema, PublicReportFormData } from '@/lib/validations/emergency'
import { EMERGENCY_TYPE_LABELS, EMERGENCY_TYPES } from '@/lib/utils'
import Button from '@/components/ui/Button'

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number; display: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&accept-language=es`
  const res = await fetch(url, { headers: { 'User-Agent': 'AlertaComunal/1.0' } })
  const data = await res.json()
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
    display: data[0].display_name.split(',').slice(0, 3).join(','),
  }
}

export default function ReportarPage() {
  const [submitted, setSubmitted] = useState(false)
  const [reportCode, setReportCode] = useState('')
  const [error, setError] = useState('')

  // Coordenadas geocodificadas
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeMsg, setGeocodeMsg] = useState<{ text: string; ok: boolean } | null>(null)

  // Foto opcional
  const photoRef = useRef<HTMLInputElement>(null)
  const [photoName, setPhotoName] = useState('')
  const [photoError, setPhotoError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PublicReportFormData>({
    resolver: zodResolver(publicReportSchema),
    defaultValues: { type: 'OTRO' },
  })

  const handleGeocode = async () => {
    const address = watch('address')
    if (!address) return
    setGeocoding(true)
    setGeocodeMsg(null)
    try {
      const result = await geocodeAddress(address)
      if (result) {
        setCoords({ lat: result.lat, lon: result.lon })
        setGeocodeMsg({ text: `Ubicado: ${result.display}`, ok: true })
      } else {
        setGeocodeMsg({ text: 'No se encontró la dirección. Agrega la ciudad o país.', ok: false })
      }
    } catch {
      setGeocodeMsg({ text: 'Error al buscar la dirección.', ok: false })
    } finally {
      setGeocoding(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError('')
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(''); return }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Tipo de archivo no permitido. Use jpg, png o webp.')
      e.target.value = ''
      setPhotoName('')
      return
    }
    const maxMb = 5
    if (file.size > maxMb * 1024 * 1024) {
      setPhotoError(`La imagen no puede superar ${maxMb} MB.`)
      e.target.value = ''
      setPhotoName('')
      return
    }
    setPhotoName(file.name)
  }

  const onSubmit = async (data: PublicReportFormData) => {
    setError('')
    try {
      const formData = new FormData()
      formData.append('reporterName', data.reporterName)
      formData.append('reporterPhone', data.reporterPhone)
      formData.append('type', data.type)
      formData.append('description', data.description)
      formData.append('address', data.address)
      if (data.sector) formData.append('sector', data.sector)
      if (coords) {
        formData.append('latitude', String(coords.lat))
        formData.append('longitude', String(coords.lon))
      }
      const photoFile = photoRef.current?.files?.[0]
      if (photoFile) formData.append('photo', photoFile)

      const res = await fetch('/api/reporte-publico', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al enviar el reporte')
      }

      const json = await res.json()
      setReportCode(json.code)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el reporte')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Reporte enviado</h2>
            <p className="text-gray-500 mb-6 text-sm">
              Su reporte fue recibido exitosamente. Un funcionario municipal revisará la situación.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">Código de seguimiento</p>
              <p className="text-2xl font-bold font-mono text-blue-900 mt-1">{reportCode}</p>
              <p className="text-xs text-blue-500 mt-1">Guarde este código para consultar el estado</p>
            </div>
            <a
              href="/consulta"
              className="text-sm text-blue-600 hover:underline block mb-3"
            >
              Consultar estado de mi reporte →
            </a>
            <button
              onClick={() => { setSubmitted(false); setReportCode(''); setCoords(null); setGeocodeMsg(null); setPhotoName('') }}
              className="text-sm text-gray-500 hover:underline"
            >
              Enviar otro reporte
            </button>
          </div>
        </div>
      </div>
    )
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
          <a href="/consulta" className="text-slate-300 hover:text-white text-xs underline">
            Consultar reporte
          </a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reportar emergencia</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Use este formulario para reportar una emergencia comunal. Un funcionario atenderá su reporte.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Datos personales */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Sus datos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="form-label">Nombre completo *</label>
                <input {...register('reporterName')} className="form-input" placeholder="Juan Pérez" />
                {errors.reporterName && <p className="form-error">{errors.reporterName.message}</p>}
              </div>
              <div>
                <label className="form-label">Teléfono de contacto *</label>
                <input {...register('reporterPhone')} className="form-input" placeholder="+56912345678" />
                {errors.reporterPhone && <p className="form-error">{errors.reporterPhone.message}</p>}
              </div>
            </div>
          </div>

          {/* Detalles emergencia */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Detalles de la emergencia</h2>
            <div>
              <label className="form-label">Tipo de emergencia *</label>
              <select {...register('type')} className="form-input">
                {EMERGENCY_TYPES.map((t) => (
                  <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Descripción *</label>
              <textarea
                {...register('description')}
                rows={4}
                className="form-input"
                placeholder="Describa detalladamente lo que ocurre: qué pasó, personas afectadas, situación actual..."
              />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Ubicación</h2>
            <div>
              <label className="form-label">Dirección exacta *</label>
              <div className="flex gap-2">
                <input
                  {...register('address')}
                  className="form-input flex-1"
                  placeholder="Av. Principal 1234, Ciudad"
                />
                <button
                  type="button"
                  onClick={handleGeocode}
                  disabled={geocoding || !watch('address')}
                  title="Buscar coordenadas automáticamente"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {geocoding ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  Geocodificar
                </button>
              </div>
              {errors.address && <p className="form-error">{errors.address.message}</p>}
              {geocodeMsg && (
                <p className={`text-xs mt-1 ${geocodeMsg.ok ? 'text-green-600' : 'text-amber-600'}`}>
                  {geocodeMsg.ok ? '✓ ' : '⚠ '}{geocodeMsg.text}
                </p>
              )}
              {coords && (
                <p className="text-xs text-gray-400 mt-1">
                  Coordenadas: {coords.lat.toFixed(5)}, {coords.lon.toFixed(5)}
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Sector o barrio</label>
              <input
                {...register('sector')}
                className="form-input"
                placeholder="Ej: Centro, Villa Los Pinos, Sector Norte..."
              />
            </div>
          </div>

          {/* Foto opcional */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Evidencia fotográfica <span className="text-gray-400 font-normal text-sm">(opcional)</span></h2>
            <div>
              <label className="form-label">Foto del incidente</label>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {photoName && (
                <p className="text-xs text-green-600 mt-1">✓ {photoName}</p>
              )}
              {photoError && (
                <p className="text-xs text-red-600 mt-1">{photoError}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">Formatos: jpg, png, webp. Máximo 5 MB.</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            <strong>Importante:</strong> Para situaciones de riesgo inmediato llame al 133 (Carabineros), 132 (Bomberos) o 131 (SAMU).
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full justify-center text-base py-3"
            disabled={!!photoError}
          >
            Enviar reporte de emergencia
          </Button>
        </form>
      </div>
    </div>
  )
}
