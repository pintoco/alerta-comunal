'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { loginSchema, LoginFormData } from '@/lib/validations/auth'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error || 'Credenciales inválidas')
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">AlertaComunal</h1>
          <p className="text-slate-400 mt-1 text-sm">Sistema de gestión de emergencias municipales</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="form-label">Correo electrónico</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="form-input"
                placeholder="usuario@municipio.cl"
              />
              {errors.email && <p className="form-error">{errors.email.message}</p>}
            </div>

            <div>
              <label className="form-label">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className="form-input"
                placeholder="••••••••"
              />
              {errors.password && <p className="form-error">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full justify-center">
              Ingresar al sistema
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            ¿Necesita reportar una emergencia?{' '}
            <a href="/reportar" className="text-blue-600 hover:underline" target="_blank">
              Formulario ciudadano
            </a>
          </p>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          AlertaComunal © {new Date().getFullYear()} — Plataforma Municipal
        </p>
      </div>
    </div>
  )
}
