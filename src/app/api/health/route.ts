import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Healthcheck para el target group del ALB. Público, sin auth, sin rate limit
// (el ALB lo llama con frecuencia desde IPs internas de la VPC).
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return NextResponse.json({ status: 'ok' }, { status: 200 })
  } catch (err) {
    console.error('[health] DB no disponible:', err)
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
