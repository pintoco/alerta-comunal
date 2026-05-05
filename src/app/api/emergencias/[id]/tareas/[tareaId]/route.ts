import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tareaId: string }> }
) {
  const session = await getSession()
  if (!session || session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id, tareaId } = await params

  try {
    const body = await request.json()
    const { status } = body

    const completedAt =
      status === 'COMPLETADA' ? new Date() : null

    const task = await prisma.task.update({
      where: { id: tareaId, emergencyId: id },
      data: { status, completedAt },
      include: { assignedTo: { select: { id: true, name: true } } },
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
  const session = await getSession()
  if (!session || session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id, tareaId } = await params

  await prisma.task.delete({ where: { id: tareaId, emergencyId: id } })
  return NextResponse.json({ success: true })
}
