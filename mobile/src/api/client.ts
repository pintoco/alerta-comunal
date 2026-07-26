import * as SecureStore from 'expo-secure-store'
import { API_URL } from '../config'

const TOKEN_KEY = 'auth-token'

// Registrado por AuthContext al montar — permite que apiFetch reaccione a un
// 401 (sesión inválida/expirada) sin crear un import circular hacia el
// contexto de React.
let unauthorizedHandler: (() => void) | null = null
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  isFormData?: boolean
}

// Wrapper delgado de fetch: agrega el JWT guardado en SecureStore como
// Authorization: Bearer (fallback de auth que el backend soporta desde el
// Sprint 7, ya que la app no tiene cookie jar httpOnly). X-Client-Type
// identifica al cliente ante /api/auth/login para que devuelva el token en
// el body — inofensivo en el resto de rutas, que ignoran headers que no
// reconocen.
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = { 'X-Client-Type': 'mobile' }
  if (token) headers.Authorization = `Bearer ${token}`
  if (!options.isFormData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.isFormData
      ? (options.body as FormData)
      : options.body !== undefined
        ? JSON.stringify(options.body)
        : undefined,
  })

  if (res.status === 401) {
    await clearToken()
    unauthorizedHandler?.()
    throw new ApiError('Sesión inválida o expirada', 401)
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    throw new ApiError((data && data.error) || 'Error de red', res.status)
  }

  return data as T
}
