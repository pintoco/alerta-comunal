import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { emergencySchema } from '@/lib/validations/emergency'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { getMunicipalityFilter, requireMunicipalityAssigned } from '@/lib/tenant'
import { sendEmergencyAssignmentEmail, isEmailEnabled } from '@/lib/email'
import { writeAuditLog } from '@/lib/audit'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const type = searchParams.get('type') || ''
  const sector = searchParams.get('sector') || ''
  const desde = searchParams.get('desde') || ''
  const hasta = searchParams.get('hasta') || ''

  const where: Record<string, unknown> = { ...getMunicipalityFilter(session) }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { title: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { reporterName: { contains: search, mode: 'insensitive' } },
    ]
  }

  if (status) where.status = status
  if (priority) where.priority = priority
  if (type) where.type = type
  if (sector) where.sector = { contains: sector, mode: 'insensitive' }

  if (desde || hasta) {
    const createdAt: Record<string, Date> = {}
    if (desde) { const d = new Date(desde); if (!isNaN(d.getTime())) createdAt.gte = d }
    if (hasta) { const d = new Date(hasta); if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); createdAt.lte = d } }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt
  }

  const rawPage = parseInt(searchParams.get('page') || '1', 10)
  const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const limit = isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 100)
  const skip = (page - 1) * limit

  const [emergencies, total] = await Promise.all([
    prisma.emergency.findMany({
      where,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.emergency.count({ where }),
  ])

  return NextResponse.json({
    data: emergencies,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  try {
    const body = await request.json()
    const result = emergencySchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    const { coAssigneeIds = [], ...emergencyData } = result.data

    // Determinar municipalityId: siempre desde sesión, nunca desde el cliente
    let municipalityId: string | null = session.municipalityId ?? null
    if (!municipalityId && session.role === 'SUPER_ADMIN') {
      const demo = await prisma.municipality.findFirst({ where: { slug: 'demo' }, select: { id: true } })
      municipalityId = demo?.id ?? null
    }

    const data = emergencyData

    // Validate assignedToId belongs to the target municipality
    if (data.assignedToId && municipalityId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: data.assignedToId },
        select: { municipalityId: true, active: true },
      })
      if (!targetUser?.active) {
        return NextResponse.json(
          { error: 'El usuario asignado no existe o está inactivo' },
          { status: 400 }
        )
      }
      if (targetUser.municipalityId && targetUser.municipalityId !== municipalityId) {
        return NextResponse.json(
          { error: 'El usuario asignado no pertenece a esta municipalidad' },
          { status: 400 }
        )
      }
    }

    const MAX_ATTEMPTS = 3
    let lastError: unknown
    let emergency: Awaited<ReturnType<typeof prisma.emergency.create>> | null = null

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = await generateEmergencyCode()
      try {
        emergency = await prisma.emergency.create({
          data: {
            ...data,
            code,
            status: data.status || 'NUEVA',
            occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
            municipalityId,
          } as any,
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
          },
        })
        break
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          (err.meta?.target as string[] | undefined)?.includes('code')
        ) {
          lastError = err
          continue
        }
        throw err
      }
    }

    if (!emergency) {
      console.error('[generate-code] No se pudo generar código único tras 3 intentos', lastError)
      return NextResponse.json(
        { error: 'No se pudo generar un código único. Inténtalo nuevamente.' },
        { status: 500 }
      )
    }

    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        userId: session.id,
        action: 'CREATED',
        description: `Emergencia registrada por ${session.name}`,
      },
    })

    // Crear co-asignados
    const validCoAssigneeIds = coAssigneeIds.filter(
      (id) => id !== data.assignedToId && id.length > 0,
    )

    // Validate co-assignees: active + same municipality
    if (validCoAssigneeIds.length > 0 && municipalityId) {
      const coUserRecords = await prisma.user.findMany({
        where: { id: { in: validCoAssigneeIds } },
        select: { id: true, municipalityId: true, active: true },
      })
      const foundIds = new Set(coUserRecords.map((u) => u.id))
      const missing = validCoAssigneeIds.find((id) => !foundIds.has(id))
      if (missing) {
        return NextResponse.json({ error: 'Uno o más co-responsables no existen' }, { status: 400 })
      }
      for (const coUser of coUserRecords) {
        if (!coUser.active) {
          return NextResponse.json({ error: 'Uno o más co-responsables están inactivos' }, { status: 400 })
        }
        if (coUser.municipalityId && coUser.municipalityId !== municipalityId) {
          return NextResponse.json({ error: 'Uno o más co-responsables no pertenecen a esta municipalidad' }, { status: 400 })
        }
      }
    }

    if (validCoAssigneeIds.length > 0) {
      await prisma.emergencyCoAssignee.createMany({
        data: validCoAssigneeIds.map((userId) => ({ emergencyId: emergency.id, userId })),
        skipDuplicates: true,
      })
    }

    // Enviar correo de asignación si se asignó responsable al crear
    if (isEmailEnabled() && data.assignedToId) {
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
            municipalityId,
          })

          await prisma.activityLog.create({
            data: {
              emergencyId: emergency.id,
              userId: session.id,
              action: emailResult.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
              description: emailResult.success
                ? `Correo de asignación enviado a ${assignedUser.name}.`
                : `No se pudo enviar correo de asignación a ${assignedUser.name}.`,
            },
          })

          await writeAuditLog({
            action: emailResult.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
            entityType: 'EMERGENCY',
            entityId: emergency.id,
            entityLabel: emergency.code,
            userId: session.id,
            userName: session.name,
            metadata: { recipientName: assignedUser.name, recipientEmail: assignedUser.email },
          })
        }
      } catch (emailErr) {
        console.error('[emergencias] Error al enviar correo de asignación:', emailErr)
      }
    }

    // Enviar correo a co-asignados
    if (isEmailEnabled() && validCoAssigneeIds.length > 0) {
      try {
        const coUsers = await prisma.user.findMany({
          where: { id: { in: validCoAssigneeIds }, active: true, emailOnAssigned: true },
          select: { name: true, email: true },
        })
        for (const coUser of coUsers) {
          if (coUser.email) {
            await sendEmergencyAssignmentEmail(coUser.email, {
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
              municipalityId,
            })
          }
        }
      } catch (emailErr) {
        console.error('[emergencias] Error al enviar correo a co-asignados:', emailErr)
      }
    }

    return NextResponse.json(emergency, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear emergencia' }, { status: 500 })
  }
}
