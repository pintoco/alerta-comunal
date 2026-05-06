'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { emergencySchema, EmergencyFormData } from '@/lib/validations/emergency'

import {
  EMERGENCY_TYPE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  EMERGENCY_TYPES,
  PRIORITIES,
  STATUSES,
} from '@/lib/utils'
import type { User, Emergency } from '@/types'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

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

interface EmergencyFormProps {
  users: Pick<User, 'id' | 'name'>[]
  initial?: Partial<Emergency>
  isEdit?: boolean
}

export default function EmergencyForm({ users, initial, isEdit }: EmergencyFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeMsg, setGeocodeMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<EmergencyFormData>({
    resolver: zodResolver(emergencySchema),
    defaultValues: {
      title: initial?.title || '',
      description: initial?.description || '',
      type: initial?.type || 'OTRO',
      priority: initial?.priority || 'MEDIA',
      status: initial?.status || 'NUEVA',
      address: initial?.address || '',
      sector: initial?.sector || '',
      latitude: initial?.latitude || null,
      longitude: initial?.longitude || null,
      reporterName: initial?.reporterName || '',
      reporterPhone: initial?.reporterPhone || '',
      origin: initial?.origin || 'INTERNO',
      assignedToId: initial?.assignedToId || null,
      occurredAt: initial?.occurredAt
        ? new Date(initial.occurredAt).toISOString().slice(0, 16)
        : '',
      observations: initial?.observations || '',
    },
  })

  const handleGeocode = async () => {
    const address = watch('address')
    if (!address) return
    setGeocoding(true)
    setGeocodeMsg(null)
    try {
      const result = await geocodeAddress(address)
      if (result) {
        setValue('latitude', result.lat, { shouldValidate: true })
        setValue('longitude', result.lon, { shouldValidate: true })
        setGeocodeMsg({ text: `Ubicado: ${result.display}`, ok: true })
      } else {
        setGeocodeMsg({ text: 'No se encontró la dirección. Intenta agregar la ciudad o país.', ok: false })
      }
    } catch {
      setGeocodeMsg({ text: 'Error al buscar la dirección.', ok: false })
    } finally {
      setGeocoding(false)
    }
  }

  const onSubmit = async (data: EmergencyFormData) => {
    setServerError('')
    setLoading(true)

    try {
      const url = isEdit ? `/api/emergencias/${initial?.id}` : '/api/emergencias'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar emergencia')
      }

      const emergency = await res.json()
      router.push(`/emergencias/${emergency.id}`)
      router.refresh()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {serverError && (
        <Alert type="error" message={serverError} onClose={() => setServerError('')} />
      )}

      {/* Sección: Información general */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Información general</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="form-label">Título *</label>
            <input
              {...register('title')}
              className="form-input"
              placeholder="Descripción breve de la emergencia"
            />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>

          <div>
            <label className="form-label">Descripción *</label>
            <textarea
              {...register('description')}
              rows={4}
              className="form-input"
              placeholder="Descripción detallada de la situación..."
            />
            {errors.description && <p className="form-error">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Tipo de emergencia *</label>
              <select {...register('type')} className="form-input">
                {EMERGENCY_TYPES.map((t) => (
                  <option key={t} value={t}>{EMERGENCY_TYPE_LABELS[t]}</option>
                ))}
              </select>
              {errors.type && <p className="form-error">{errors.type.message}</p>}
            </div>

            <div>
              <label className="form-label">Prioridad *</label>
              <select {...register('priority')} className="form-input">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                ))}
              </select>
              {errors.priority && <p className="form-error">{errors.priority.message}</p>}
            </div>

            {isEdit && (
              <div>
                <label className="form-label">Estado</label>
                <select {...register('status')} className="form-input">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="form-label">Observaciones</label>
            <textarea
              {...register('observations')}
              rows={2}
              className="form-input"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>
      </div>

      {/* Sección: Ubicación */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Ubicación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="form-label">Dirección *</label>
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
                  <svg className="w-4 h-4 animate-spin text-gray-500" fill="none" viewBox="0 0 24 24">
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
                {geocodeMsg.text}
              </p>
            )}
          </div>

          <div>
            <label className="form-label">Sector</label>
            <input
              {...register('sector')}
              className="form-input"
              placeholder="Ej: Centro, Norte, Sur..."
            />
          </div>

          <div>
            <label className="form-label">Fecha/hora de ocurrencia</label>
            <input
              type="datetime-local"
              {...register('occurredAt')}
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Latitud</label>
            <input
              type="number"
              step="any"
              {...register('latitude', { valueAsNumber: true })}
              className="form-input"
              placeholder="-33.4569"
            />
            <p className="text-xs text-gray-400 mt-1">Se completa al geocodificar</p>
          </div>

          <div>
            <label className="form-label">Longitud</label>
            <input
              type="number"
              step="any"
              {...register('longitude', { valueAsNumber: true })}
              className="form-input"
              placeholder="-70.6483"
            />
            <p className="text-xs text-gray-400 mt-1">Se completa al geocodificar</p>
          </div>
        </div>
      </div>

      {/* Sección: Reportante */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Datos del reportante</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Nombre reportante</label>
            <input
              {...register('reporterName')}
              className="form-input"
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="form-label">Teléfono</label>
            <input
              {...register('reporterPhone')}
              className="form-input"
              placeholder="+56912345678"
            />
          </div>

          <div>
            <label className="form-label">Origen del reporte *</label>
            <select {...register('origin')} className="form-input">
              <option value="INTERNO">Interno</option>
              <option value="CIUDADANO">Ciudadano</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección: Asignación */}
      <div className="card p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Asignación</h3>
        <div className="max-w-sm">
          <label className="form-label">Responsable asignado</label>
          <select {...register('assignedToId')} className="form-input">
            <option value="">Sin asignar</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="secondary" type="button" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {isEdit ? 'Guardar cambios' : 'Registrar emergencia'}
        </Button>
      </div>
    </form>
  )
}
