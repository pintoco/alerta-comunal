import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { Prisma } from '@prisma/client'
import { publicReportSchema } from '@/lib/validations/emergency'
import { municipalityConfig } from '@/lib/config'
import { validateFile, saveUpload } from '@/lib/storage'
import {
  sendMunicipalityNewReportEmail,
  isEmailEnabled,
} from '@/lib/email'

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

    const rawLatitude = formData.get('latitude')
    const rawLongitude = formData.get('longitude')

    const body = {
      reporterName: formData.get('reporterName') as string,
      reporterPhone: formData.get('reporterPhone') as string,
      type: formData.get('type') as string,
      description: formData.get('description') as string,
      address: formData.get('address') as string,
      sector: (formData.get('sector') as string) || undefined,
      region: (formData.get('region') as string) || undefined,
      commune: (formData.get('commune') as string) || undefined,
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

    // ── Resolver municipalidad por región/comuna o fallback a demo ────────────
    let municipalityId: string | null = null
    let municipalityName: string | null = null
    let assignedByCommune = false

    if (data.region && data.commune) {
      const matching = await prisma.municipality.findMany({
        where: { region: data.region, commune: data.commune, active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      if (matching.length > 0) {
        municipalityId = matching[0].id
        municipalityName = matching[0].name
        assignedByCommune = true

        if (matching.length > 1) {
          console.warn(
            `[reporte-publico] Múltiples municipalidades activas para ${data.region} / ` +
              `${data.commune}. Se usó "${matching[0].name}". IDs: ${matching.map((m) => m.id).join(', ')}`
          )
        }
      }
    }

    // Fallback a municipalidad demo
    if (!municipalityId) {
      if (data.region && data.commune) {
        console.warn(
          `[reporte-publico] Sin municipalidad activa para ${data.commune}, ${data.region}. ` +
            'Usando municipalidad por defecto.'
        )
      }
      try {
        const demo = await prisma.municipality.upsert({
          where: { slug: municipalityConfig.defaultSlug },
          create: { name: 'Municipalidad Demo', slug: municipalityConfig.defaultSlug, active: true },
          update: {},
          select: { id: true, name: true },
        })
        municipalityId = demo.id
        municipalityName = demo.name
      } catch {
        // Continuar sin municipalidad si la tabla aún no existe
      }
    }

    // ── Crear emergencia con retry ante colisión de código ────────────────────
    const code = await generateEmergencyCode()
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
            region: data.region || null,
            commune: data.commune || null,
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

    // ActivityLog: creación
    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        action: 'CREATED',
        description: `Reporte ciudadano recibido de ${data.reporterName} (${data.reporterPhone})`,
      },
    })

    // ActivityLog: asignación de municipalidad por región/comuna
    if (assignedByCommune && municipalityName) {
      await prisma.activityLog.create({
        data: {
          emergencyId: emergency.id,
          action: 'MUNICIPALITY_ASSIGNED',
          description: `Asignado automáticamente a "${municipalityName}" por coincidencia de región/comuna.`,
        },
      })
    } else if (data.region && data.commune && municipalityId) {
      await prisma.activityLog.create({
        data: {
          emergencyId: emergency.id,
          action: 'MUNICIPALITY_ASSIGNED',
          description: `No se encontró municipalidad para la comuna seleccionada. Se usó municipalidad por defecto: "${municipalityName}".`,
        },
      })
    }

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
        console.error('[reporte-publico] Error al guardar foto del ciudadano:', photoErr)
      }
    }

    // ── Notificar por correo a los administradores de la municipalidad ────────
    if (isEmailEnabled() && municipalityId) {
      try {
        const admins = await prisma.user.findMany({
          where: { municipalityId, role: 'ADMIN', active: true },
          select: { email: true, name: true },
        })

        if (admins.length > 0) {
          const emailResult = await sendMunicipalityNewReportEmail(
            admins.map((a) => a.email),
            {
              id: emergency.id,
              code: emergency.code,
              type: emergency.type,
              priority: emergency.priority,
              status: emergency.status,
              region: emergency.region,
              commune: emergency.commune,
              address: emergency.address,
              sector: emergency.sector,
              reporterName: emergency.reporterName,
              reporterPhone: emergency.reporterPhone,
              description: emergency.description,
              createdAt: emergency.createdAt,
              municipalityName,
            }
          )

          await prisma.activityLog.create({
            data: {
              emergencyId: emergency.id,
              action: emailResult.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
              description: emailResult.success
                ? `Correo de nuevo reporte enviado a ${admins.length} administrador(es) municipal(es).`
                : `No se pudo enviar correo de notificación al administrador municipal.`,
            },
          })

          if (!emailResult.success) {
            console.error('[reporte-publico] Fallo al enviar correo:', emailResult.error)
          }
        } else {
          console.warn(
            `[reporte-publico] Sin administradores activos para municipalidad ${municipalityId}. Correo no enviado.`
          )
        }
      } catch (emailErr) {
        console.error('[reporte-publico] Error inesperado al enviar correo:', emailErr)
      }
    }

    return NextResponse.json({ code: emergency.code, id: emergency.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
  }
}
