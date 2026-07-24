import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { generateWebhookSecret, validateWebhookUrl } from '@/lib/webhooks'

const webhookSchema = z.object({
  url: z.string().url(),
  enabled: z.boolean().optional().default(true),
  onEmergencyCreated: z.boolean().optional().default(true),
  onNewCitizenReport: z.boolean().optional().default(true),
  onAssignment: z.boolean().optional().default(true),
  regenerateSecret: z.boolean().optional().default(false),
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

  const webhook = await prisma.municipalityWebhook.findUnique({ where: { municipalityId: id } })
  return NextResponse.json(webhook)
}

export async function PUT(
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
  const result = webhookSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: result.error.flatten() }, { status: 400 })
  }

  const { url, enabled, onEmergencyCreated, onNewCitizenReport, onAssignment, regenerateSecret } = result.data

  const urlError = validateWebhookUrl(url)
  if (urlError) {
    return NextResponse.json({ error: urlError }, { status: 400 })
  }

  const existing = await prisma.municipalityWebhook.findUnique({ where: { municipalityId: id } })
  const secret = !existing || regenerateSecret ? generateWebhookSecret() : existing.secret

  const webhook = await prisma.municipalityWebhook.upsert({
    where: { municipalityId: id },
    create: { municipalityId: id, url, secret, enabled, onEmergencyCreated, onNewCitizenReport, onAssignment },
    update: { url, secret, enabled, onEmergencyCreated, onNewCitizenReport, onAssignment },
  })

  await writeAuditLog({
    action: existing ? 'WEBHOOK_CONFIG_UPDATED' : 'WEBHOOK_CONFIG_CREATED',
    entityType: 'MUNICIPALITY_WEBHOOK',
    entityId: webhook.id,
    entityLabel: id,
    userId: session.id,
    userName: session.name,
    metadata: { municipalityId: id, enabled, secretRegenerated: !existing || regenerateSecret },
  })

  return NextResponse.json(webhook)
}
