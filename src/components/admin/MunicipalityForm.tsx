'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { municipalitySchema } from '@/lib/validations/municipality'
import { CHILE_REGIONS_COMMUNES } from '@/data/chile-regions-communes'
import type { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type FormValues = z.infer<typeof municipalitySchema>

interface Props {
  initialData?: Partial<FormValues> & { id?: string }
  mode: 'create' | 'edit'
}

export default function MunicipalityForm({ initialData, mode }: Props) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(municipalitySchema),
    defaultValues: {
      name: initialData?.name ?? '',
      slug: initialData?.slug ?? '',
      region: initialData?.region ?? '',
      commune: initialData?.commune ?? '',
      active: initialData?.active ?? true,
    },
  })

  const selectedRegion = watch('region')
  const availableCommunes =
    CHILE_REGIONS_COMMUNES.find((r) => r.region === selectedRegion)?.comunas ?? []

  const { onChange: regionOnChange, ...regionRest } = register('region')

  const onSubmit = async (data: FormValues) => {
    setError(null)
    const url =
      mode === 'edit' && initialData?.id
        ? `/api/admin/municipalidades/${initialData.id}`
        : '/api/admin/municipalidades'
    const method = mode === 'edit' ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      router.push('/admin/municipalidades')
      router.refresh()
    } else {
      const body = await res.json()
      setError(body.error ?? 'Error al guardar municipalidad')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="form-label">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          {...register('name')}
          className="form-input"
          placeholder="Municipalidad de Santiago"
        />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>

      <div>
        <label className="form-label">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          {...register('slug')}
          className="form-input font-mono"
          placeholder="santiago"
          readOnly={mode === 'edit'}
        />
        {mode === 'edit' && (
          <p className="text-xs text-amber-600 mt-1">
            El slug no puede modificarse si ya tiene datos públicos asociados.
          </p>
        )}
        {errors.slug && <p className="text-xs text-red-500 mt-1">{errors.slug.message}</p>}
      </div>

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
            <option key={r.region} value={r.region}>
              {r.region}
            </option>
          ))}
        </select>
        {errors.region && <p className="text-xs text-red-500 mt-1">{errors.region.message}</p>}
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
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {errors.commune && (
          <p className="text-xs text-red-500 mt-1">{errors.commune.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" {...register('active')} className="w-4 h-4 rounded" />
        <label htmlFor="active" className="text-sm text-gray-700">
          Municipalidad activa
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {isSubmitting ? 'Guardando…' : mode === 'edit' ? 'Guardar cambios' : 'Crear municipalidad'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}
