import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole, MANAGE_ROLES } from '@/lib/permissions'
import { validateFile, saveUpload, deleteUpload } from '@/lib/storage'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const { id } = await params
  const evidences = await prisma.evidence.findMany({
    where: { emergencyId: id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(evidences)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const { id } = await params

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    const validationError = validateFile(file.type, file.size)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const { filename, url } = await saveUpload(buffer, file.name, file.type)

    const evidence = await prisma.evidence.create({
      data: {
        emergencyId: id,
        filename,
        originalName: file.name,
        url,
        mimeType: file.type,
        size: file.size,
        description: description || null,
      },
    })

    await prisma.activityLog.create({
      data: {
        emergencyId: id,
        userId: session.id,
        action: 'EVIDENCE_ADDED',
        description: `Evidencia fotográfica subida por ${session.name}: ${file.name}`,
      },
    })

    return NextResponse.json(evidence, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al subir evidencia' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, MANAGE_ROLES)
  if (denied) return denied

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const evidenceId = searchParams.get('evidenceId')

  if (!evidenceId) {
    return NextResponse.json({ error: 'ID de evidencia requerido' }, { status: 400 })
  }

  const evidence = await prisma.evidence.findUnique({
    where: { id: evidenceId, emergencyId: id },
  })

  if (!evidence) {
    return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 })
  }

  await prisma.evidence.delete({ where: { id: evidenceId } })
  try {
    await deleteUpload(evidence.filename, evidence.url)
  } catch (err) {
    console.error('[evidencias] Error al borrar archivo físico:', err)
  }

  await prisma.activityLog.create({
    data: {
      emergencyId: id,
      userId: session.id,
      action: 'EVIDENCE_DELETED',
      description: `Se eliminó la evidencia "${evidence.originalName}" por ${session.name}`,
    },
  })

  return NextResponse.json({ success: true })
}
