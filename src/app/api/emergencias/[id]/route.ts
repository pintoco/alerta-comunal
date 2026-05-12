import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { emergencySchema } from '@/lib/validations/emergency'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { requireEmergencyAccess, requireMunicipalityAssigned } from '@/lib/tenant'
import { sendEmergencyAssignmentEmail, isEmailEnabled } from '@/lib/email'
import { deleteUpload } from '@/lib/storage'

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

    // Enviar correo si el responsable cambió a uno nuevo (no a null)
    if (
      isEmailEnabled() &&
      data.assignedToId &&
      data.assignedToId !== previous.assignedToId
    ) {
      try {
        const assignedUser = await prisma.user.findUnique({
          where: { id: data.assignedToId },
          select: { name: true, email: true, active: true, emailOnAssigned: true },
        })

        if (assignedUser?.active && assignedUser.email && assignedUser.emailOnAssigned) {
          const emailResult = await sendEmergencyAssignmentEmail(assignedUser.email, {
            id: emergency.id,
            code: emergency.code,
            type: emergency.type,
            priority: emergency.priority,
            status: emergency.status,
            region: emergency.region,
            commune: emergency.commune,
            address: emergency.address,
            sector: emergency.sector,
            description: emergency.description,
            assignedByName: session.name,
          })

          await prisma.activityLog.create({
            data: {
              emergencyId: id,
              userId: session.id,
              action: emailResult.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
              description: emailResult.success
                ? `Correo de asignación enviado a ${assignedUser.name}.`
                : `No se pudo enviar correo de asignación a ${assignedUser.name}.`,
            },
          })
        }
      } catch (emailErr) {
        console.error('[emergencias] Error al enviar correo de reasignación:', emailErr)
      }
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
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['ADMIN'])
  if (denied) return denied

  const { id } = await params

  const access = await requireEmergencyAccess(session, id)
  if (access instanceof NextResponse) return access

  const evidences = await prisma.evidence.findMany({
    where: { emergencyId: id },
    select: { filename: true, url: true },
  })

  await prisma.emergency.delete({ where: { id } })

  for (const ev of evidences) {
    try {
      await deleteUpload(ev.filename, ev.url)
    } catch (err) {
      console.error(`[emergencias] No se pudo eliminar archivo ${ev.filename}:`, err)
    }
  }

  return NextResponse.json({ success: true })
}
