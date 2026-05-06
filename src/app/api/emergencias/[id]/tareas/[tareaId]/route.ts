import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const { id, tareaId } = await params

  try {
    const body = await request.json()
    const { status } = body

    const completedAt = status === 'COMPLETADA' ? new Date() : null

    const task = await prisma.task.update({
      where: { id: tareaId, emergencyId: id },
      data: { status, completedAt },
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    await prisma.activityLog.create({
      data: {
        emergencyId: id,
        userId: session.id,
        action: 'TASK_STATUS_CHANGED',
        description: `La tarea "${task.title}" cambió a ${status} por ${session.name}`,
      },
    })

    return NextResponse.json(task)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar tarea' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const { id, tareaId } = await params

  try {
    const task = await prisma.task.findUnique({
      where: { id: tareaId, emergencyId: id },
    })

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 })
    }

    await prisma.task.delete({ where: { id: tareaId, emergencyId: id } })

    await prisma.activityLog.create({
      data: {
        emergencyId: id,
        userId: session.id,
        action: 'TASK_DELETED',
        description: `Se eliminó la tarea "${task.title}" por ${session.name}`,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar tarea' }, { status: 500 })
  }
}
