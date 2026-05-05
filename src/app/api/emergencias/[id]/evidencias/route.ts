import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

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
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  if (session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó archivo' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo supera el tamaño máximo (10MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    await writeFile(join(uploadDir, filename), buffer)

    const evidence = await prisma.evidence.create({
      data: {
        emergencyId: id,
        filename,
        originalName: file.name,
        url: `/uploads/${filename}`,
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
  const session = await getSession()
  if (!session || session.role === 'VISUALIZADOR') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const evidenceId = searchParams.get('evidenceId')

  if (!evidenceId) {
    return NextResponse.json({ error: 'ID de evidencia requerido' }, { status: 400 })
  }

  await prisma.evidence.delete({ where: { id: evidenceId, emergencyId: id } })
  return NextResponse.json({ success: true })
}
