import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode, generatePublicToken } from '@/lib/generate-code'
import { Prisma } from '@prisma/client'
import { publicReportSchema } from '@/lib/validations/emergency'
import { municipalityConfig, isProduction, turnstileConfig } from '@/lib/config'
import { validateFile, saveUpload } from '@/lib/storage'
import {
  sendMunicipalityNewReportEmail,
  isEmailEnabled,
} from '@/lib/email'
import { sendWebhook } from '@/lib/webhooks'
import { checkRateLimit, getClientIpFromRequest } from '@/lib/rate-limit'

async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: turnstileConfig.secretKey, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    return data.success === true
  } catch (err) {
    console.error('[reporte-publico] Error al verificar Turnstile:', err)
    return false
  }
}

// ─── GET /api/reporte-publico?token=... ──────────────────────────────────────
// Consulta pública de estado por token de seguimiento (no por el `code` interno,
// que es secuencial y por tanto enumerable). No expone datos internos sensibles.
export async function GET(request: Request) {
  const ip = getClientIpFromRequest(request)
  const rateLimit = await checkRateLimit(`public-report-get:${ip}`, 30, 10 * 60 * 1000)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Intenta nuevamente más tarde.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimit.retryAfterSeconds ?? 600) },
      }
    )
  }

  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')?.trim()

  if (!token) {
    return NextResponse.json({ error: 'Se requiere el parámetro token' }, { status: 400 })
  }

  const emergency = await prisma.emergency.findUnique({
    where: { publicToken: token },
    select: {
      code: true,
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
      { error: 'No se encontró un reporte con ese código de seguimiento.' },
      { status: 404 }
    )
  }

  return NextResponse.json(emergency)
}

// ─── POST /api/reporte-publico ────────────────────────────────────────────────
// Crea un reporte ciudadano. Acepta multipart/form-data para soportar foto opcional.
export async function POST(request: Request) {
  try {
    const ip = getClientIpFromRequest(request)
    const rateLimit = await checkRateLimit(`public-report-post:${ip}`, 5, 15 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Demasiados reportes enviados. Intenta nuevamente más tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds ?? 900) },
        }
      )
    }

    const formData = await request.formData()

    const rawLatitude = formData.get('latitude')
    const rawLongitude = formData.get('longitude')
    const turnstileToken = (formData.get('turnstileToken') as string) || undefined

    // CAPTCHA adaptativo: la mayoría de los ciudadanos (un solo reporte) nunca lo ven.
    // Solo se exige a partir del 2do envío desde la misma IP en 15 minutos — señal
    // barata de patrón sospechoso, reutilizando checkRateLimit con un umbral propio
    // sin tocar el rate limit real (5/15min) que sigue aplicando igual.
    if (turnstileConfig.enabled) {
      const suspicion = await checkRateLimit(`public-report-suspect:${ip}`, 1, 15 * 60 * 1000)
      if (!suspicion.allowed) {
        if (!turnstileToken) {
          return NextResponse.json({ error: 'CAPTCHA_REQUIRED' }, { status: 428 })
        }
        const validCaptcha = await verifyTurnstileToken(turnstileToken, ip)
        if (!validCaptcha) {
          return NextResponse.json(
            { error: 'Verificación de seguridad fallida. Intenta nuevamente.' },
            { status: 400 }
          )
        }
      }
    }

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
      dataConsent: formData.get('dataConsent') === 'true',
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

    // ── Resolver municipalidad: slug explícito (/reportar/[slug]) tiene prioridad,
    // luego región/comuna, luego fallback a demo ──────────────────────────────
    let municipalityId: string | null = null
    let municipalityName: string | null = null
    let assignedByCommune = false

    const explicitSlug = ((formData.get('municipalitySlug') as string) || '').trim()

    if (explicitSlug) {
      const muni = await prisma.municipality.findUnique({
        where: { slug: explicitSlug },
        select: { id: true, name: true, active: true },
      })
      if (!muni || !muni.active) {
        return NextResponse.json(
          { error: 'Municipalidad no disponible. Verifica el enlace o contacta al municipio.' },
          { status: 400 }
        )
      }
      municipalityId = muni.id
      municipalityName = muni.name
    } else if (data.region && data.commune) {
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

    // Fallback a municipalidad por defecto — solo fuera de producción.
    // En producción, crear/usar una municipalidad "demo" silenciosamente
    // significaría que reportes ciudadanos reales con comuna no reconocida
    // terminan en un bucket que nadie monitorea. Mejor rechazar con un
    // mensaje claro que el ciudadano pueda corregir.
    if (!municipalityId) {
      if (isProduction) {
        return NextResponse.json(
          {
            error:
              'No pudimos determinar tu municipalidad. Usa el enlace específico de tu municipio o verifica la región/comuna seleccionada.',
          },
          { status: 400 }
        )
      }

      if (data.region && data.commune) {
        console.warn(
          `[reporte-publico] Sin municipalidad activa para ${data.commune}, ${data.region}. ` +
            'Usando municipalidad por defecto (modo no productivo).'
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

    // ── Crear emergencia con retry ante colisión de código o token ────────────
    const code = await generateEmergencyCode()
    const publicToken = generatePublicToken()
    const MAX_ATTEMPTS = 3
    let emergency: Awaited<ReturnType<typeof prisma.emergency.create>> | null = null
    let lastError: unknown

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const attemptCode = attempt === 0 ? code : await generateEmergencyCode()
      const attemptToken = attempt === 0 ? publicToken : generatePublicToken()
      try {
        emergency = await prisma.emergency.create({
          data: {
            code: attemptCode,
            publicToken: attemptToken,
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
            consentAcceptedAt: new Date(),
            origin: 'CIUDADANO',
            municipalityId,
          },
        })
        break
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002' &&
          ((err.meta?.target as string[] | undefined)?.includes('code') ||
            (err.meta?.target as string[] | undefined)?.includes('publicToken'))
        ) {
          lastError = err
          continue
        }
        throw err
      }
    }

    if (!emergency) {
      console.error('[reporte-publico] No se pudo generar código/token único', lastError)
      return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
    }

    // ActivityLog: creación — sin nombre/teléfono en el texto libre (quedan solo
    // en las columnas reporterName/reporterPhone, controladas por rol).
    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        action: 'CREATED',
        description: 'Reporte ciudadano recibido.',
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
          where: { municipalityId, role: 'ADMIN', active: true, emailOnNewReport: true },
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

    // ── Notificar por webhook a la municipalidad (independiente del correo) ───
    if (municipalityId) {
      const webhookResult = await sendWebhook(municipalityId, 'NEW_CITIZEN_REPORT', {
        municipality: { id: municipalityId, name: municipalityName },
        emergency: {
          id: emergency.id,
          code: emergency.code,
          type: emergency.type,
          priority: emergency.priority,
          status: emergency.status,
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
            action: webhookResult.success ? 'WEBHOOK_SENT' : 'WEBHOOK_FAILED',
            description: webhookResult.success
              ? 'Webhook de la municipalidad notificado (nuevo reporte ciudadano).'
              : `No se pudo notificar el webhook de nuevo reporte: ${webhookResult.error}`,
          },
        })
        if (!webhookResult.success) {
          console.error('[reporte-publico] Fallo al enviar webhook:', webhookResult.error)
        }
      }
    }

    return NextResponse.json({ token: emergency.publicToken, id: emergency.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
  }
}
