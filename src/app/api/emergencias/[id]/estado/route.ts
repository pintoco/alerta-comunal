import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { statusUpdateSchema } from '@/lib/validations/emergency'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const result = statusUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { status, closingNotes } = result.data

    const previous = await prisma.emergency.findUnique({ where: { id } })
    if (!previous) {
      return NextResponse.json({ error: 'Emergencia no encontrada' }, { status: 404 })
    }

    const isClosed = status === 'CERRADA' || status === 'RESUELTA'

    const emergency = await prisma.emergency.update({
      where: { id },
      data: {
        status,
        closingNotes: closingNotes || null,
        closedAt: isClosed ? new Date() : null,
      },
    })

    await prisma.activityLog.create({
      data: {
        emergencyId: id,
        userId: session.id,
        action: 'STATUS_CHANGED',
        description: `Estado cambiado de ${previous.status} a ${status} por ${session.name}`,
      },
    })

    return NextResponse.json(emergency)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar estado' }, { status: 500 })
  }
}
