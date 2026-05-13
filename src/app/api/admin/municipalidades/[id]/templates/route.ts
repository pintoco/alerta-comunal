import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'

const templateSchema = z.object({
  type: z.enum(['ASSIGNMENT', 'NEW_REPORT']),
  subject: z.string().min(1).max(300),
  body: z.string().min(1),
  enabled: z.boolean().optional().default(true),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN'])
  if (denied) return denied

  const { id } = await params

  const templates = await prisma.municipalityEmailTemplate.findMany({
    where: { municipalityId: id },
    orderBy: { type: 'asc' },
  })

  return NextResponse.json(templates)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN'])
  if (denied) return denied

  const { id } = await params

  const municipality = await prisma.municipality.findUnique({ where: { id }, select: { id: true } })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const body = await request.json()
  const result = templateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const { type, subject, body: tplBody, enabled } = result.data

  const template = await prisma.municipalityEmailTemplate.upsert({
    where: { municipalityId_type: { municipalityId: id, type } },
    create: { municipalityId: id, type, subject, body: tplBody, enabled: enabled ?? true },
    update: { subject, body: tplBody, enabled: enabled ?? true },
  })

  return NextResponse.json(template)
}
