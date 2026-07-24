import * as Sentry from '@sentry/nextjs'

/**
 * Se ejecuta una vez al arrancar el servidor (Next.js 15, sin flags
 * experimentales). Falla rápido si falta configuración crítica en
 * producción, en vez de recién fallar en el primer login/verificación.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getJwtSecret } = await import('./src/lib/config')
    getJwtSecret() // lanza si falta JWT_SECRET en producción
    await import('./sentry.server.config')
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
