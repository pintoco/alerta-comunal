import { SignJWT, jwtVerify } from 'jose'
import { cookies, headers } from 'next/headers'
import type { Session } from '@/types'
import { getJwtSecret } from './config'

const getSecret = () => new TextEncoder().encode(getJwtSecret())

export async function createToken(payload: Session): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as unknown as Session
  } catch {
    return null
  }
}

export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    let token = cookieStore.get('auth-token')?.value

    // Fallback para la app móvil: no tiene cookie jar httpOnly, envía el JWT
    // guardado en SecureStore como Authorization: Bearer. Sin efecto para
    // clientes web (siempre traen la cookie primero).
    if (!token) {
      const headersList = await headers()
      const authHeader = headersList.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice('Bearer '.length)
      }
    }

    if (!token) return null
    return await verifyToken(token)
  } catch {
    return null
  }
}
