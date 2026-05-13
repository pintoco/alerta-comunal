'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

const DEMO_USERS = IS_DEMO
  ? [
      {
        role: 'SUPER_ADMIN',
        label: 'Super Administrador',
        email: 'superadmin@alertacomunal.cl',
        password: 'SuperAdmin123',
        badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
        dot: 'bg-purple-400',
        desc: 'Vista global de plataforma · gestión de municipios y usuarios',
      },
      {
        role: 'ADMIN',
        label: 'Administrador Municipal',
        email: 'ppinto@elementalpro.cl',
        password: 'Admin123456',
        badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        dot: 'bg-blue-400',
        desc: 'Municipalidad Demo · gestión completa de emergencias',
      },
      {
        role: 'OPERADOR',
        label: 'Operador',
        email: 'mgonzalez@alertacomunal.cl',
        password: 'Operador123',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        dot: 'bg-cyan-400',
        desc: 'Municipalidad Demo · María González',
      },
      {
        role: 'OPERADOR',
        label: 'Operador',
        email: 'cmartinez@alertacomunal.cl',
        password: 'Operador123',
        badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
        dot: 'bg-cyan-400',
        desc: 'Municipalidad Demo · Carlos Martínez',
      },
      {
        role: 'VISUALIZADOR',
        label: 'Visualizador',
        email: 'visualizador@alertacomunal.cl',
        password: 'Visualizador123',
        badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        dot: 'bg-slate-400',
        desc: 'Municipalidad Demo · solo lectura',
      },
    ]
  : []

export default function QuickLogin() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!IS_DEMO) return null

  const login = async (email: string, password: string) => {
    setLoading(email)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error ?? 'Error al iniciar sesión')
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Error de conexión. Intente nuevamente.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12">
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-5 flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        <div>
          <p className="text-amber-300 text-xs font-semibold uppercase tracking-wide mb-0.5">Modo demo</p>
          <p className="text-amber-200/80 text-xs">Acceso rápido para pruebas. Haz clic en cualquier usuario para entrar inmediatamente.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            onClick={() => login(u.email, u.password)}
            disabled={loading !== null}
            className="text-left bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${u.badge}`}>
                {u.label}
              </span>
              {loading === u.email ? (
                <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              )}
            </div>
            <p className="text-white text-xs font-mono mb-1">{u.email}</p>
            <p className="text-slate-500 text-xs font-mono mb-2">{u.password}</p>
            <p className="text-slate-400 text-xs leading-snug">{u.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
