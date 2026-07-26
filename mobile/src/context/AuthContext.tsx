import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, fetchMe } from '../api/auth'
import { getToken, clearToken, setUnauthorizedHandler } from '../api/client'
import { registerDeviceToken, unregisterDeviceToken } from '../api/push'
import { registerForPushNotificationsAsync } from '../notifications'
import type { Session } from '../types'

// Fire-and-forget: nunca debe bloquear ni romper login/logout si push falla
// (proyecto sin vincular a EAS, permiso denegado, sin red, etc.)
async function syncPushRegistration(action: 'register' | 'unregister') {
  try {
    const push = await registerForPushNotificationsAsync()
    if (!push) return
    if (action === 'register') await registerDeviceToken(push.token, push.platform)
    else await unregisterDeviceToken(push.token)
  } catch (err) {
    console.warn('[push] no se pudo sincronizar el device token:', err)
  }
}

interface AuthContextValue {
  session: Session | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const logout = useCallback(async () => {
    await syncPushRegistration('unregister')
    await clearToken()
    setSession(null)
  }, [])

  useEffect(() => {
    // El cliente API llama esto solo cuando el backend responde 401 — token
    // vencido/inválido en cualquier request, no solo en el login.
    setUnauthorizedHandler(() => setSession(null))
    ;(async () => {
      const token = await getToken()
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const me = await fetchMe()
        setSession(me)
        syncPushRegistration('register')
      } catch {
        setSession(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    try {
      const me = await apiLogin(email, password)
      setSession(me)
      syncPushRegistration('register')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      throw err
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
