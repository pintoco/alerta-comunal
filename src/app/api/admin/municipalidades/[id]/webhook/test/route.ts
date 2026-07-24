import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { sendWebhook } from '@/lib/webhooks'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN'])
  if (denied) return denied

  const { id } = await params

  const municipality = await prisma.municipality.findUnique({ where: { id }, select: { id: true, name: true, slug: true } })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const result = await sendWebhook(id, 'TEST', {
    municipality: { id: municipality.id, name: municipality.name, slug: municipality.slug },
    message: 'Ping de prueba desde AlertaComunal.',
  })

  if (result.skipped) {
    return NextResponse.json({ error: 'Primero guarda una URL de webhook para esta municipalidad.' }, { status: 400 })
  }

  if (!result.success) {
    return NextResponse.json({ error: result.error || 'No se pudo enviar el webhook de prueba.' }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
