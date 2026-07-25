import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireAuth, requireRole } from '@/lib/permissions'
import { writeAuditLog } from '@/lib/audit'
import { validateFile, saveUpload, deleteUpload } from '@/lib/storage'

const primaryColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe ser un hexadecimal válido, ej. #2563EB')
  .optional()
  .nullable()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    select: { logoUrl: true, primaryColor: true },
  })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  return NextResponse.json(municipality)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAuth()
  if (session instanceof NextResponse) return session

  const denied = requireRole(session, ['SUPER_ADMIN', 'ADMIN'])
  if (denied) return denied

  const { id } = await params

  if (session.role === 'ADMIN' && session.municipalityId !== id) {
    return NextResponse.json({ error: 'No tienes acceso a esta municipalidad' }, { status: 403 })
  }

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    select: { logoUrl: true },
  })
  if (!municipality) {
    return NextResponse.json({ error: 'Municipalidad no encontrada' }, { status: 404 })
  }

  const formData = await request.formData()
  const rawColor = formData.get('primaryColor')
  const colorResult = primaryColorSchema.safeParse(
    typeof rawColor === 'string' && rawColor.length > 0 ? rawColor : null,
  )
  if (!colorResult.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: colorResult.error.flatten() },
      { status: 400 },
    )
  }

  const logoFile = formData.get('logo') as File | null
  let logoUrl = municipality.logoUrl

  if (logoFile && logoFile.size > 0) {
    const fileError = validateFile(logoFile.type, logoFile.size)
    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 })
    }
    const bytes = await logoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const { url } = await saveUpload(buffer, logoFile.name, logoFile.type)
    if (municipality.logoUrl) {
      try {
        await deleteUpload(municipality.logoUrl.split('/').pop() || '', municipality.logoUrl)
      } catch (err) {
        console.error('[branding] No se pudo eliminar el logo anterior:', err)
      }
    }
    logoUrl = url
  }

  const updated = await prisma.municipality.update({
    where: { id },
    data: { logoUrl, primaryColor: colorResult.data },
    select: { logoUrl: true, primaryColor: true },
  })

  await writeAuditLog({
    action: 'MUNICIPALITY_BRANDING_UPDATED',
    entityType: 'MUNICIPALITY',
    entityId: id,
    entityLabel: id,
    userId: session.id,
    userName: session.name,
    metadata: { logoUpdated: !!logoFile, primaryColor: colorResult.data },
  })

  return NextResponse.json(updated)
}
