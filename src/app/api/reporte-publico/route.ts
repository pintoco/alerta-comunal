import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { Prisma } from '@prisma/client'
import { publicReportSchema } from '@/lib/validations/emergency'
import { municipalityConfig } from '@/lib/config'
import { validateFile, saveUpload } from '@/lib/storage'

// ─── GET /api/reporte-publico?code=EMG-XXXX-XXXX ─────────────────────────────
// Consulta pública de estado por código. No expone datos internos sensibles.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()

  if (!code) {
    return NextResponse.json({ error: 'Se requiere el parámetro code' }, { status: 400 })
  }

  const emergency = await prisma.emergency.findUnique({
    where: { code },
    select: {
      code: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      address: true,
      sector: true,
      origin: true,
      createdAt: true,
      occurredAt: true,
      closedAt: true,
      // closingNotes se expone como nota pública de cierre
      closingNotes: true,
    },
  })

  if (!emergency) {
    return NextResponse.json(
      { error: 'No se encontró una emergencia con ese código.' },
      { status: 404 }
    )
  }

  return NextResponse.json(emergency)
}

// ─── POST /api/reporte-publico ────────────────────────────────────────────────
// Crea un reporte ciudadano. Acepta multipart/form-data para soportar foto opcional.
export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    // Extraer y parsear campos de texto
    const rawLatitude = formData.get('latitude')
    const rawLongitude = formData.get('longitude')

    const body = {
      reporterName: formData.get('reporterName') as string,
      reporterPhone: formData.get('reporterPhone') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      address: formData.get('address') as string,
      sector: (formData.get('sector') as string) || undefined,
      latitude:
        rawLatitude && rawLatitude !== '' ? parseFloat(rawLatitude as string) : null,
      longitude:
        rawLongitude && rawLongitude !== '' ? parseFloat(rawLongitude as string) : null,
    }

    const result = publicReportSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: result.error.flatten() },
        { status: 400 }
      )
    }

    // Validar foto si se adjuntó
    const photoFile = formData.get('photo') as File | null
    if (photoFile && photoFile.size > 0) {
      const fileError = validateFile(photoFile.type, photoFile.size)
      if (fileError) {
        return NextResponse.json({ error: fileError }, { status: 400 })
      }
    }

    const data = result.data
    const code = await generateEmergencyCode()

    // Obtener (o crear) municipalidad demo
    let municipalityId: string | null = null
    try {
      const municipality = await prisma.municipality.upsert({
        where: { slug: municipalityConfig.defaultSlug },
        create: {
          name: 'Municipalidad Demo',
          slug: municipalityConfig.defaultSlug,
          active: true,
        },
        update: {},
        select: { id: true },
      })
      municipalityId = municipality.id
    } catch {
      // Si falla (ej. tabla no existe), continuar sin municipalidad
    }

    // Retry ante colisión de código (igual que en emergencias internas)
    const MAX_ATTEMPTS = 3
    let emergency: Awaited<ReturnType<typeof prisma.emergency.create>> | null = null
    let lastError: unknown

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptCode = attempt === 0 ? code : await generateEmergencyCode()
      try {
        emergency = await prisma.emergency.create({
          data: {
            code: attemptCode,
            title: `Reporte ciudadano: ${data.type}`,
            description: data.description,
            type: data.type,
            priority: 'MEDIA',
            status: 'NUEVA',
            address: data.address,
            sector: data.sector || null,
            latitude: data.latitude || null,
            longitude: data.longitude || null,
            reporterName: data.reporterName,
            reporterPhone: data.reporterPhone,
            origin: 'CIUDADANO',
            municipalityId,
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
      console.error('[reporte-publico] No se pudo generar código único', lastError)
      return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
    }

    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        action: 'CREATED',
        description: `Reporte ciudadano recibido de ${data.reporterName} (${data.reporterPhone})`,
      },
    })

    // Guardar foto si se adjuntó (fallo no bloquea la creación)
    if (photoFile && photoFile.size > 0) {
      try {
        const bytes = await photoFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const { filename, url } = await saveUpload(buffer, photoFile.name, photoFile.type)

        await prisma.evidence.create({
          data: {
            emergencyId: emergency.id,
            filename,
            originalName: photoFile.name,
            url,
            mimeType: photoFile.type,
            size: photoFile.size,
            description: 'Foto adjunta por ciudadano',
          },
        })

        await prisma.activityLog.create({
          data: {
            emergencyId: emergency.id,
            action: 'EVIDENCE_ADDED',
            description: `Evidencia fotográfica adjunta en reporte ciudadano: ${photoFile.name}`,
          },
        })
      } catch (photoErr) {
        // La emergencia ya fue creada y tiene código. Solo loguear el error de la foto.
        console.error('[reporte-publico] Error al guardar foto del ciudadano:', photoErr)
      }
    }

    return NextResponse.json({ code: emergency.code, id: emergency.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
  }
}
