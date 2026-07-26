import { apiFetch, setToken } from './client'
import type { Session } from '../types'

interface LoginResponse {
  success: boolean
  user: { id: string; name: string; email: string; role: string }
  token?: string
}

export async function login(email: string, password: string): Promise<Session> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  if (!data.token) {
    // No debería pasar contra un backend con Sprint 7 desplegado (siempre
    // devuelve token cuando ve X-Client-Type: mobile) — mensaje explícito en
    // vez de un fallo silencioso si algún día apunta a un backend viejo.
    throw new Error('El servidor no devolvió un token de sesión. ¿La API está actualizada?')
  }

  await setToken(data.token)
  return fetchMe()
}

export async function fetchMe(): Promise<Session> {
  return apiFetch<Session>('/api/auth/me')
}
