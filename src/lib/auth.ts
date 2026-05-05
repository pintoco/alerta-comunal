import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Session } from '@/types'

const getSecret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET || 'alerta-comunal-secret-key-change-in-production'
  )

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
    const token = cookieStore.get('auth-token')?.value
    if (!token) return null
    return await verifyToken(token)
  } catch {
    return null
  }
}
