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
import LocationPicker, { type Coords } from '@/components/emergencies/LocationPicker'
import { CHILE_REGIONS_COMMUNES } from '@/data/chile-regions-communes'

interface EmergencyFormProps {
  users: Pick<User, 'id' | 'name'>[]
  initial?: Partial<Emergency>
  isEdit?: boolean
}

export default function EmergencyForm({ users, initial, isEdit }: EmergencyFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [coords, setCoords] = useState<Coords | null>(
    initial?.latitude && initial?.longitude
      ? { lat: initial.latitude, lng: initial.longitude }
      : null
  )

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
      region: initial?.region || '',
      commune: initial?.commune || '',
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

  const selectedRegion = watch('region')
  const selectedCommune = watch('commune')
  const availableCommunes =
    CHILE_REGIONS_COMMUNES.find((r) => r.region === selectedRegion)?.comunas ?? []
  const locationContext = [selectedCommune, selectedRegion].filter(Boolean).join(', ') || undefined

  const { onChange: regionOnChange, ...regionRest } = register('region')

  const handleCoordsChange = (c: Coords | null) => {
    setCoords(c)
    setValue('latitude', c?.lat ?? null, { shouldValidate: true })
    setValue('longitude', c?.lng ?? null, { shouldValidate: true })
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
          <div>
            <label className="form-label">Región</label>
            <select
              {...regionRest}
              onChange={(e) => {
                regionOnChange(e)
                setValue('commune', '', { shouldValidate: false })
              }}
              className="form-input"
            >
              <option value="">— Selecciona una región —</option>
              {CHILE_REGIONS_COMMUNES.map((r) => (
                <option key={r.region} value={r.region}>{r.region}</option>
              ))}
            </select>
            {errors.region && <p className="form-error">{errors.region.message}</p>}
          </div>

          <div>
            <label className="form-label">Comuna</label>
            <select
              {...register('commune')}
              className="form-input disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedRegion}
            >
              <option value="">
                {selectedRegion ? '— Selecciona una comuna —' : '— Primero selecciona una región —'}
              </option>
              {availableCommunes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.commune && <p className="form-error">{errors.commune.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="form-label">Dirección *</label>
            <LocationPicker
              address={watch('address') || ''}
              onAddressChange={(v) => setValue('address', v, { shouldValidate: true })}
              coords={coords}
              onCoordsChange={handleCoordsChange}
              addressError={errors.address?.message}
              placeholder="Av. Principal 1234"
              contextHint={locationContext}
            />
          </div>

          <div>
            <label className="form-label">Sector / Barrio</label>
            <input
              {...register('sector')}
              className="form-input"
              placeholder="Ej: Centro, Villa Los Pinos, Sector Norte..."
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
