import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { createToken } from '@/lib/auth'
import { loginSchema } from '@/lib/validations/auth'
import { isProduction } from '@/lib/config'
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit'
import { writeAuditLog } from '@/lib/audit'

function getClientIp(headersList: Awaited<ReturnType<typeof headers>>): string {
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    '127.0.0.1'
  )
}

export async function POST(request: Request) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)

    const rateLimit = checkRateLimit(ip, 5, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      await writeAuditLog({
        action: 'RATE_LIMIT_HIT',
        entityType: 'AUTH',
        ipAddress: ip,
        metadata: { retryAfterSeconds: rateLimit.retryAfterSeconds },
      })
      return NextResponse.json(
        {
          error: 'Demasiados intentos. Intenta nuevamente más tarde.',
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds ?? 900),
          },
        }
      )
    }

    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || !user.active) {
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityLabel: email,
        ipAddress: ip,
        metadata: { reason: !user ? 'user_not_found' : 'user_inactive' },
      })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      await writeAuditLog({
        action: 'LOGIN_FAILED',
        entityType: 'AUTH',
        entityLabel: email,
        ipAddress: ip,
        metadata: { reason: 'invalid_password' },
      })
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    // Login exitoso: limpiar el contador de intentos
    resetRateLimit(ip)

    const session = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      municipalityId: user.municipalityId ?? null,
    }

    const token = await createToken(session)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
