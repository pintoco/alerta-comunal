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

const ALL_ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador' },
  { value: 'ADMIN', label: 'Administrador municipal' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
] as const

const LIMITED_ROLES = [
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'VISUALIZADOR', label: 'Visualizador' },
] as const

// ─── Shared field block ───────────────────────────────────────────────────────

function FormFields({
  register,
  errors,
  municipalities,
  municipalityRequired,
  showPassword,
  roles,
  lockedMunicipalityId,
}: {
  register: any
  errors: any
  municipalities: Municipality[]
  municipalityRequired: boolean
  showPassword: boolean
  roles: readonly { value: string; label: string }[]
  lockedMunicipalityId?: string | null
}) {
  const lockedMun = lockedMunicipalityId
    ? municipalities.find((m) => m.id === lockedMunicipalityId)
    : null

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
          {roles.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
      </div>
      <div>
        <label className="form-label">
          Municipalidad {municipalityRequired && <span className="text-red-500">*</span>}
        </label>
        {lockedMun ? (
          <div>
            <input type="hidden" {...register('municipalityId')} />
            <input
              type="text"
              className="form-input bg-gray-50 cursor-not-allowed text-gray-500"
              value={lockedMun.name}
              disabled
              readOnly
            />
            <p className="text-xs text-gray-400 mt-1">Asignada automáticamente a tu municipalidad.</p>
          </div>
        ) : (
          <select {...register('municipalityId')} className="form-input">
            <option value="">Sin municipalidad (solo SUPER_ADMIN)</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}
        {errors.municipalityId && (
          <p className="text-xs text-red-500 mt-1">{errors.municipalityId.message}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input type="checkbox" id="active" {...register('active')} className="w-4 h-4 rounded" />
        <label htmlFor="active" className="text-sm text-gray-700">Usuario activo</label>
      </div>
      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Notificaciones por correo
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input type="checkbox" id="emailOnAssigned" {...register('emailOnAssigned')} className="w-4 h-4 rounded mt-0.5" />
            <label htmlFor="emailOnAssigned" className="text-sm text-gray-700">
              Recibir correo al ser asignado como responsable de una emergencia
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input type="checkbox" id="emailOnNewReport" {...register('emailOnNewReport')} className="w-4 h-4 rounded mt-0.5" />
            <label htmlFor="emailOnNewReport" className="text-sm text-gray-700">
              Recibir correo cuando se recibe un reporte ciudadano
              <span className="ml-1 text-xs text-gray-400">(solo aplica a Administradores municipales)</span>
            </label>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateUserForm({
  municipalities,
  isSuperAdmin,
  lockedMunicipalityId,
}: {
  municipalities: Municipality[]
  isSuperAdmin: boolean
  lockedMunicipalityId?: string | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const roles = isSuperAdmin ? ALL_ROLES : LIMITED_ROLES

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'OPERADOR',
      municipalityId: lockedMunicipalityId ?? null,
      active: true,
      emailOnAssigned: true,
      emailOnNewReport: true,
    },
  })

  const selectedRole = watch('role')
  const municipalityRequired = ['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(selectedRole)

  const onSubmit = async (data: CreateValues) => {
    setError(null)
    const payload = lockedMunicipalityId
      ? { ...data, municipalityId: lockedMunicipalityId }
      : data
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      router.push('/admin/usuarios')
      router.refresh()
    } else {
      const b = await res.json()
      setError(b.error ?? 'Error al crear usuario')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      <FormFields
        register={register}
        errors={errors}
        municipalities={municipalities}
        municipalityRequired={municipalityRequired}
        showPassword
        roles={roles}
        lockedMunicipalityId={lockedMunicipalityId}
      />
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-50">
          {isSubmitting ? 'Guardando…' : 'Crear usuario'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditUserForm({
  userId,
  initialData,
  municipalities,
  isSuperAdmin,
  lockedMunicipalityId,
}: {
  userId: string
  initialData: {
    name: string
    email: string
    role: string
    municipalityId: string | null
    active: boolean
    emailOnAssigned: boolean
    emailOnNewReport: boolean
  }
  municipalities: Municipality[]
  isSuperAdmin: boolean
  lockedMunicipalityId?: string | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const roles = isSuperAdmin ? ALL_ROLES : LIMITED_ROLES

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<UpdateValues>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
      role: initialData.role as UpdateValues['role'],
      municipalityId: lockedMunicipalityId ?? initialData.municipalityId,
      active: initialData.active,
      emailOnAssigned: initialData.emailOnAssigned,
      emailOnNewReport: initialData.emailOnNewReport,
    },
  })

  const selectedRole = watch('role')
  const municipalityRequired = selectedRole
    ? ['ADMIN', 'OPERADOR', 'VISUALIZADOR'].includes(selectedRole)
    : false

  const onSubmit = async (data: UpdateValues) => {
    setError(null)
    setPasswordError(null)

    // Validate password fields if user wants to change password
    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        setPasswordError('La contraseña debe tener al menos 8 caracteres')
        return
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Las contraseñas no coinciden')
        return
      }
    }

    const payload = lockedMunicipalityId
      ? { ...data, municipalityId: lockedMunicipalityId }
      : data

    const res = await fetch(`/api/admin/usuarios/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const b = await res.json()
      setError(b.error ?? 'Error al guardar usuario')
      return
    }

    // Change password if provided
    if (newPassword) {
      const pwRes = await fetch(`/api/admin/usuarios/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (!pwRes.ok) {
        const b = await pwRes.json()
        setPasswordError(b.error ?? 'Error al cambiar la contraseña')
        return
      }
    }

    router.push('/admin/usuarios')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}
      <FormFields
        register={register}
        errors={errors}
        municipalities={municipalities}
        municipalityRequired={municipalityRequired}
        showPassword={false}
        roles={roles}
        lockedMunicipalityId={lockedMunicipalityId}
      />

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Cambiar contraseña <span className="normal-case font-normal text-gray-400">(dejar vacío para no cambiar)</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="form-label">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null) }}
              className="form-input"
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="form-label">Confirmar contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null) }}
              className="form-input"
              placeholder="Repetir nueva contraseña"
              autoComplete="new-password"
            />
          </div>
          {passwordError && <p className="text-xs text-red-500">{passwordError}</p>}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary text-sm disabled:opacity-50">
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary text-sm">
          Cancelar
        </button>
      </div>
    </form>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

type Props =
  | {
      mode: 'create'
      municipalities: Municipality[]
      isSuperAdmin?: boolean
      lockedMunicipalityId?: string | null
    }
  | {
      mode: 'edit'
      userId: string
      initialData: {
        name: string
        email: string
        role: string
        municipalityId: string | null
        active: boolean
        emailOnAssigned: boolean
        emailOnNewReport: boolean
      }
      municipalities: Municipality[]
      isSuperAdmin?: boolean
      lockedMunicipalityId?: string | null
    }

export default function UserForm(props: Props) {
  if (props.mode === 'create') {
    return (
      <CreateUserForm
        municipalities={props.municipalities}
        isSuperAdmin={props.isSuperAdmin ?? true}
        lockedMunicipalityId={props.lockedMunicipalityId}
      />
    )
  }
  return (
    <EditUserForm
      userId={props.userId}
      initialData={props.initialData}
      municipalities={props.municipalities}
      isSuperAdmin={props.isSuperAdmin ?? true}
      lockedMunicipalityId={props.lockedMunicipalityId}
    />
  )
}
