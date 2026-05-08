'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { userCreateSchema, userUpdateSchema } from '@/lib/validations/user'
import type { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Municipality = { id: string; name: string }
type CreateValues = z.infer<typeof userCreateSchema>
type UpdateValues = z.infer<typeof userUpdateSchema>

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'ADMIN', label: 'Administrador municipal' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
] as const

function CreateUserForm({ municipalities }: { municipalities: Municipality[] }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { name: '', email: '', password: '', role: 'OPERADOR', municipalityId: null, active: true },
  })

  const selectedRole = watch('role')
  const municipalityRequired = ['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(selectedRole)

  const onSubmit = async (data: CreateValues) => {
    setError(null)
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { router.push('/admin/usuarios'); router.refresh() }
    else { const b = await res.json(); setError(b.error ?? 'Error al crear usuario') }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
      <FormFields
        register={register} errors={errors} watch={watch as any}
        municipalities={municipalities} municipalityRequired={municipalityRequired}
        showPassword isEdit={false}
      />
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-50">
          {isSubmitting ? 'Guardando…' : 'Crear usuario'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </form>
  )
}

function EditUserForm({
  userId,
  initialData,
  municipalities,
}: {
  userId: string
  initialData: { name: string; email: string; role: string; municipalityId: string | null; active: boolean }
  municipalities: Municipality[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<UpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
      role: initialData.role as UpdateValues['role'],
      municipalityId: initialData.municipalityId,
      active: initialData.active,
    },
  })

  const selectedRole = watch('role')
  const municipalityRequired = selectedRole ? ['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(selectedRole) : false

  const onSubmit = async (data: UpdateValues) => {
    setError(null)
    const res = await fetch(`/api/admin/usuarios/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { router.push('/admin/usuarios'); router.refresh() }
    else { const b = await res.json(); setError(b.error ?? 'Error al guardar usuario') }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}
      <FormFields
        register={register} errors={errors} watch={watch as any}
        municipalities={municipalities} municipalityRequired={municipalityRequired}
        showPassword={false} isEdit
      />
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-50">
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">Cancelar</button>
      </div>
    </form>
  )
}

function FormFields({
  register, errors, municipalities, municipalityRequired, showPassword, isEdit,
}: {
  register: any
  errors: any
  watch: any
  municipalities: Municipality[]
  municipalityRequired: boolean
  showPassword: boolean
  isEdit: boolean
}) {
  return (
    <>
      <div>
        <label className="form-label">Nombre <span className="text-red-500">*</span></label>
        <input {...register('name')} className="form-input" placeholder="Juan Pérez" />
        {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
      </div>
      <div>
        <label className="form-label">Email <span className="text-red-500">*</span></label>
        <input {...register('email')} type="email" className="form-input" placeholder="juan@municipalidad.cl" />
        {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
      </div>
      {showPassword && (
        <div>
          <label className="form-label">Contraseña <span className="text-red-500">*</span></label>
          <input {...register('password')} type="password" className="form-input" placeholder="Mínimo 8 caracteres" />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
      )}
      <div>
        <label className="form-label">Rol <span className="text-red-500">*</span></label>
        <select {...register('role')} className="form-input">
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
      </div>
      <div>
        <label className="form-label">
          Municipalidad {municipalityRequired && <span className="text-red-500">*</span>}
        </label>
        <select {...register('municipalityId')} className="form-input">
          <option value="">Sin municipalidad (solo SUPER_ADMIN)</option>
          {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        {errors.municipalityId && <p className="text-xs text-red-500 mt-1">{errors.municipalityId.message}</p>}
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" {...register('active')} className="w-4 h-4 rounded" />
        <label htmlFor="active" className="text-sm text-gray-700">Usuario activo</label>
      </div>
    </>
  )
}

type Props =
  | { mode: 'create'; municipalities: Municipality[] }
  | { mode: 'edit'; userId: string; initialData: { name: string; email: string; role: string; municipalityId: string | null; active: boolean }; municipalities: Municipality[] }

export default function UserForm(props: Props) {
  if (props.mode === 'create') {
    return <CreateUserForm municipalities={props.municipalities} />
  }
  return <EditUserForm userId={props.userId} initialData={props.initialData} municipalities={props.municipalities} />
}
