import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { generateEmergencyCode } from '@/lib/generate-code'
import { emergencySchema } from '@/lib/validations/emergency'

export async function GET(request: Request) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''
  const type = searchParams.get('type') || ''
  const sector = searchParams.get('sector') || ''

  const where: Record<string, unknown> = {}

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
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

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
    const code = await generateEmergencyCode()

    const emergency = await prisma.emergency.create({
      data: {
        ...data,
        code,
        status: data.status || 'NUEVA',
        occurredAt: data.occurredAt ? new Date(data.occurredAt) : null,
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
  } catch {
    return NextResponse.json({ error: 'Error al crear emergencia' }, { status: 500 })
  }
}
