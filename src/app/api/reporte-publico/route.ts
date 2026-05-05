import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateEmergencyCode } from '@/lib/generate-code'
import { publicReportSchema } from '@/lib/validations/emergency'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = publicReportSchema.safeParse(body)

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
        code,
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
      },
    })

    await prisma.activityLog.create({
      data: {
        emergencyId: emergency.id,
        action: 'CREATED',
        description: `Reporte ciudadano recibido de ${data.reporterName} (${data.reporterPhone})`,
      },
    })

    return NextResponse.json({ code: emergency.code, id: emergency.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al procesar el reporte' }, { status: 500 })
  }
}
