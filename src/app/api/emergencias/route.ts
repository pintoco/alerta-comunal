import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { emergencySchema } from '@/lib/validations/emergency'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { getMunicipalityFilter, requireMunicipalityAssigned } from '@/lib/tenant'
import { sendEmergencyAssignmentEmail, isEmailEnabled } from '@/lib/email'
import { sendWebhook } from '@/lib/webhooks'
import { sendPushNotification } from '@/lib/push'
import { writeAuditLog } from '@/lib/audit'
import { redactPII } from '@/lib/pii'

export async function GET(request: Request) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const noMunicipality = requireMunicipalityAssigned(session)
  if (noMunicipality) return noMunicipality

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const category = searchParams.get('category') || ''
  const sector = searchParams.get('sector') || ''
  const desde = searchParams.get('desde') || ''
  const hasta = searchParams.get('hasta') || ''
  // Usado por la app móvil ("Mis emergencias"): sin esto, el filtro por
  // responsable asignado tendría que hacerse client-side sobre el listado
  // completo de la municipalidad, ineficiente e inconsistente con el resto
  // de filtros de este endpoint, que siempre se aplican a nivel de query.
  const assignedToId = searchParams.get('assignedToId') || ''

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
  if (category) where.category = { label: { equals: category, mode: 'insensitive' } }
  if (sector) where.sector = { contains: sector, mode: 'insensitive' }
  if (assignedToId) where.assignedToId = assignedToId

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
        category: { select: { id: true, label: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.emergency.count({ where }),
  ])

  return NextResponse.json({
    data: emergencies.map((e) => redactPII(e, session)),
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

    // Validate categoryId belongs to the target municipality
    if (data.categoryId) {
      const category = await prisma.emergencyCategory.findUnique({
        where: { id: data.categoryId },
        select: { municipalityId: true },
      })
      if (!category || category.municipalityId !== municipalityId) {
        return NextResponse.json(
          { error: 'La categoría seleccionada no pertenece a esta municipalidad' },
          { status: 400 }
        )
      }
    }

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
    let emergency: Prisma.EmergencyGetPayload<{
      include: {
        assignedTo: { select: { id: true; name: true; email: true } }
        category: { select: { id: true; label: true } }
      }
    }> | null = null

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
            category: { select: { id: true, label: true } },
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

    if (municipalityId) {
      const webhookResult = await sendWebhook(municipalityId, 'EMERGENCY_CREATED', {
        municipality: { id: municipalityId },
        emergency: {
          id: emergency.id,
          code: emergency.code,
          category: emergency.category?.label ?? null,
          priority: emergency.priority,
          status: emergency.status,
          origin: emergency.origin,
          region: emergency.region,
          commune: emergency.commune,
          address: emergency.address,
          sector: emergency.sector,
          description: emergency.description,
          reporterName: emergency.reporterName,
          reporterPhone: emergency.reporterPhone,
          createdAt: emergency.createdAt,
        },
      })
      if (!webhookResult.skipped) {
        await prisma.activityLog.create({
          data: {
            emergencyId: emergency.id,
            userId: session.id,
            action: webhookResult.success ? 'WEBHOOK_SENT' : 'WEBHOOK_FAILED',
            description: webhookResult.success
              ? 'Webhook de la municipalidad notificado (emergencia creada).'
              : `No se pudo notificar el webhook de la municipalidad: ${webhookResult.error}`,
          },
        })
        await writeAuditLog({
          action: webhookResult.success ? 'WEBHOOK_SENT' : 'WEBHOOK_FAILED',
          entityType: 'EMERGENCY',
          entityId: emergency.id,
          entityLabel: emergency.code,
          userId: session.id,
          userName: session.name,
          metadata: { event: 'EMERGENCY_CREATED', error: webhookResult.error },
        })
      }
    }

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
            categoryLabel: emergency.category?.label ?? null,
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

    // Notificación push al responsable asignado (canal independiente del correo/webhook)
    if (data.assignedToId) {
      try {
        const pushTargetUser = await prisma.user.findUnique({
          where: { id: data.assignedToId },
          select: { name: true, active: true },
        })
        if (pushTargetUser?.active) {
          const pushResult = await sendPushNotification(data.assignedToId, {
            title: `Emergencia asignada — ${emergency.code}`,
            body: `${emergency.category?.label ?? 'Sin categoría'} en ${emergency.address}`,
            data: { emergencyId: emergency.id },
          })
          if (!pushResult.skipped) {
            await prisma.activityLog.create({
              data: {
                emergencyId: emergency.id,
                userId: session.id,
                action: pushResult.success ? 'PUSH_SENT' : 'PUSH_FAILED',
                description: pushResult.success
                  ? `Notificación push enviada a ${pushTargetUser.name}.`
                  : `No se pudo enviar la notificación push a ${pushTargetUser.name}.`,
              },
            })
            await writeAuditLog({
              action: pushResult.success ? 'PUSH_SENT' : 'PUSH_FAILED',
              entityType: 'EMERGENCY',
              entityId: emergency.id,
              entityLabel: emergency.code,
              userId: session.id,
              userName: session.name,
              metadata: { recipientName: pushTargetUser.name, error: pushResult.error },
            })
          }
        }
      } catch (pushErr) {
        console.error('[emergencias] Error al enviar push de asignación:', pushErr)
      }
    }

    // Webhook de asignación al crear (independiente de si el correo está habilitado)
    if (municipalityId && data.assignedToId) {
      const webhookResult = await sendWebhook(municipalityId, 'EMERGENCY_ASSIGNED', {
        municipality: { id: municipalityId },
        emergency: {
          id: emergency.id,
          code: emergency.code,
          category: emergency.category?.label ?? null,
          priority: emergency.priority,
          status: emergency.status,
          address: emergency.address,
          sector: emergency.sector,
          description: emergency.description,
        },
        assignedToId: data.assignedToId,
        assignedByName: session.name,
      })
      if (!webhookResult.skipped) {
        await prisma.activityLog.create({
          data: {
            emergencyId: emergency.id,
            userId: session.id,
            action: webhookResult.success ? 'WEBHOOK_SENT' : 'WEBHOOK_FAILED',
            description: webhookResult.success
              ? 'Webhook de la municipalidad notificado (responsable asignado).'
              : `No se pudo notificar el webhook de asignación: ${webhookResult.error}`,
          },
        })
        await writeAuditLog({
          action: webhookResult.success ? 'WEBHOOK_SENT' : 'WEBHOOK_FAILED',
          entityType: 'EMERGENCY',
          entityId: emergency.id,
          entityLabel: emergency.code,
          userId: session.id,
          userName: session.name,
          metadata: { event: 'EMERGENCY_ASSIGNED', error: webhookResult.error },
        })
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
              categoryLabel: emergency.category?.label ?? null,
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

    // Notificación push a co-asignados
    if (validCoAssigneeIds.length > 0) {
      try {
        const coUsers = await prisma.user.findMany({
          where: { id: { in: validCoAssigneeIds }, active: true },
          select: { id: true },
        })
        for (const coUser of coUsers) {
          await sendPushNotification(coUser.id, {
            title: `Te agregaron como co-responsable — ${emergency.code}`,
            body: `${emergency.category?.label ?? 'Sin categoría'} en ${emergency.address}`,
            data: { emergencyId: emergency.id },
          })
        }
      } catch (pushErr) {
        console.error('[emergencias] Error al enviar push a co-asignados:', pushErr)
      }
    }

    return NextResponse.json(emergency, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear emergencia' }, { status: 500 })
  }
}
