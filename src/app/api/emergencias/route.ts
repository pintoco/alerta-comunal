import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { emergencySchema } from '@/lib/validations/emergency'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { getMunicipalityFilter, requireMunicipalityAssigned } from '@/lib/tenant'

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

  const emergencies = await prisma.emergency.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(emergencies)
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

    const data = result.data

    // Determinar municipalityId: siempre desde sesión, nunca desde el cliente
    let municipalityId: string | null = session.municipalityId ?? null
    if (!municipalityId && session.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN sin municipalidad propia: asignar municipalidad demo como fallback
      const demo = await prisma.municipality.findFirst({ where: { slug: 'demo' }, select: { id: true } })
      municipalityId = demo?.id ?? null
    }

    const MAX_ATTEMPTS = 3
    let lastError: unknown

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const code = await generateEmergencyCode()

      try {
        const emergency = await prisma.emergency.create({
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

        await prisma.activityLog.create({
          data: {
            emergencyId: emergency.id,
            userId: session.id,
            action: 'CREATED',
            description: `Emergencia registrada por ${session.name}`,
          },
        })

        return NextResponse.json(emergency, { status: 201 })
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

    console.error('[generate-code] No se pudo generar código único tras 3 intentos', lastError)
    return NextResponse.json(
      { error: 'No se pudo generar un código único. Inténtalo nuevamente.' },
      { status: 500 }
    )
  } catch {
    return NextResponse.json({ error: 'Error al crear emergencia' }, { status: 500 })
  }
}
