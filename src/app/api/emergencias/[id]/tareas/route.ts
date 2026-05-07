import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { taskSchema } from '@/lib/validations/task'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { requireEmergencyAccess, requireMunicipalityAssigned } from '@/lib/tenant'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  const { id } = await params

  const access = await requireEmergencyAccess(session, id)
  if (access instanceof NextResponse) return access

  const tasks = await prisma.task.findMany({
    where: { emergencyId: id },
    include: { assignedTo: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(tasks)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  const { id } = await params

  const access = await requireEmergencyAccess(session, id)
  if (access instanceof NextResponse) return access

  try {
    const body = await request.json()
    const result = taskSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const data = result.data

    const task = await prisma.task.create({
      data: {
        emergencyId: id,
        title: data.title,
        description: data.description || null,
        status: data.status || 'PENDIENTE',
        assignedToId: data.assignedToId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: { assignedTo: { select: { id: true, name: true } } },
    })

    await prisma.activityLog.create({
      data: {
        emergencyId: id,
        userId: session.id,
        action: 'TASK_CREATED',
        description: `Tarea creada: "${task.title}" por ${session.name}`,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear tarea' }, { status: 500 })
  }
}
