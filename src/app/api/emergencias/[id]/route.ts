import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { emergencySchema } from '@/lib/validations/emergency'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { id } = await params

  const emergency = await prisma.emergency.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true } },
      evidences: { orderBy: { createdAt: 'desc' } },
      tasks: {
        include: { assignedTo: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      activityLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  })

  if (!emergency) {
    return NextResponse.json({ error: 'Emergencia no encontrada' }, { status: 404 })
  }

  return NextResponse.json(emergency)
}

export async function PUT(
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
    const result = emergencySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const data = result.data
    const previous = await prisma.emergency.findUnique({ where: { id } })
    if (!previous) {
      return NextResponse.json({ error: 'Emergencia no encontrada' }, { status: 404 })
    }

    const emergency = await prisma.emergency.update({
      where: { id },
      data: {
        ...data,
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
      } as any,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    })

    const logs: Array<{ action: string; description: string }> = []

    if (previous.assignedToId !== data.assignedToId) {
      logs.push({ action: 'ASSIGNED', description: `Responsable actualizado por ${session.name}` })
    }
    if (previous.status !== data.status) {
      logs.push({
        action: 'STATUS_CHANGED',
        description: `Estado cambiado de ${previous.status} a ${data.status} por ${session.name}`,
      })
    }
    if (logs.length === 0) {
      logs.push({ action: 'UPDATED', description: `Emergencia actualizada por ${session.name}` })
    }

    for (const log of logs) {
      await prisma.activityLog.create({
        data: { emergencyId: id, userId: session.id, ...log },
      })
    }

    return NextResponse.json(emergency)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar emergencia' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params

  await prisma.emergency.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
