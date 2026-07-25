import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { statusUpdateSchema } from '@/lib/validations/emergency'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { requireEmergencyAccess, requireMunicipalityAssigned } from '@/lib/tenant'

export async function PATCH(
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
    const result = statusUpdateSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }

    const { status, closingNotes, closingReasonId } = result.data

    if (status === 'CERRADA' && (!closingNotes || closingNotes.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Las notas de cierre son obligatorias al cerrar una emergencia (mínimo 10 caracteres).' },
        { status: 400 }
      )
    }

    if (status === 'CERRADA' && !closingReasonId) {
      return NextResponse.json(
        { error: 'Debes seleccionar un motivo de cierre.' },
        { status: 400 }
      )
    }

    const previous = await prisma.emergency.findUnique({ where: { id } })
    if (!previous) {
      return NextResponse.json({ error: 'Emergencia no encontrada' }, { status: 404 })
    }

    if (closingReasonId) {
      const reason = await prisma.closingReason.findUnique({ where: { id: closingReasonId } })
      if (!reason || reason.municipalityId !== previous.municipalityId) {
        return NextResponse.json(
          { error: 'El motivo de cierre no pertenece a la municipalidad de esta emergencia' },
          { status: 400 }
        )
      }
    }

    const isClosed = status === 'CERRADA' || status === 'RESUELTA'

    const emergency = await prisma.emergency.update({
      where: { id },
      data: {
        status,
        closingNotes: closingNotes || null,
        closingReasonId: isClosed ? closingReasonId || null : null,
        closedAt: isClosed ? new Date() : null,
      },
      include: { closingReason: { select: { id: true, label: true } } },
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
