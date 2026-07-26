import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { login as apiLogin, fetchMe } from '../api/auth'
import { getToken, clearToken, setUnauthorizedHandler } from '../api/client'
import type { Session } from '../types'

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
        setSession(await fetchMe())
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
      setSession(await apiLogin(email, password))
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
