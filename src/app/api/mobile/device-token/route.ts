import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/permissions'

const registerSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['IOS', 'ANDROID']),
})

const unregisterSchema = z.object({
  token: z.string().min(1),
})

// Registra/actualiza el token de push (Expo) del dispositivo desde el que se
// llama. La app móvil lo invoca tras el login y al obtener/renovar el token
// de expo-notifications.
export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const result = registerSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const { token, platform } = result.data

  await prisma.deviceToken.upsert({
    where: { userId_token: { userId: session.id, token } },
    update: { platform },
    create: { userId: session.id, token, platform },
  })

  return NextResponse.json({ success: true })
}

// Da de baja el token al cerrar sesión en la app — evita que un dispositivo
// desvinculado siga recibiendo notificaciones de una cuenta a la que ya no
// debería tener acceso.
export async function DELETE(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const body = await request.json()
  const result = unregisterSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  await prisma.deviceToken.deleteMany({
    where: { userId: session.id, token: result.data.token },
  })

  return NextResponse.json({ success: true })
}
