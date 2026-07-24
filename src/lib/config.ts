/**
 * Configuración centralizada de variables de entorno.
 * getJwtSecret() lanza error en producción si JWT_SECRET no está definido.
 */

export const isProduction =
  process.env.NODE_ENV === 'production' ||
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.RAILWAY_PROJECT_ID

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (isProduction) {
      throw new Error(
        '[AlertaComunal] JWT_SECRET es obligatorio en producción. ' +
          'Configúralo en las variables de entorno del servicio Railway.'
      )
    }
    return 'alerta-comunal-dev-secret-DO-NOT-USE-IN-PRODUCTION'
  }
  return secret
}

export const storageConfig = {
  provider: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3',
  maxSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '5', 10),
}

export const municipalityConfig = {
  defaultSlug: process.env.PUBLIC_DEFAULT_MUNICIPALITY_SLUG || 'demo',
}

export const appUrl = process.env.APP_URL || 'http://localhost:3000'

const EMAIL_FROM_DEFAULT = 'tecnico@elementalpro.cl'

if (
  process.env.EMAIL_ENABLED === 'true' &&
  !process.env.EMAIL_FROM &&
  isProduction
) {
  console.warn(
    '[AlertaComunal] EMAIL_ENABLED=true pero EMAIL_FROM no está configurado. ' +
      `Usando remitente de respaldo "${EMAIL_FROM_DEFAULT}". ` +
      'En producción, configura EMAIL_FROM con un dominio verificado en Resend.'
  )
}

export const emailConfig = {
  enabled: process.env.EMAIL_ENABLED === 'true',
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.EMAIL_FROM || EMAIL_FROM_DEFAULT,
}

// CAPTCHA adaptativo en /reportar (Cloudflare Turnstile). Opcional — sin ambas
// keys configuradas, el chequeo de CAPTCHA se omite por completo (igual que
// Google Maps cuando falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY).
export const turnstileConfig = {
  siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  secretKey: process.env.TURNSTILE_SECRET_KEY || '',
  get enabled() {
    return !!(this.siteKey && this.secretKey)
  },
}

// Monitoreo de errores y performance (Sentry). Opcional — sin DSN configurado,
// Sentry.init() recibe dsn: '' y queda deshabilitado (no envía nada), igual
// que el resto de las integraciones opcionales de este archivo.
export const sentryConfig = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  environment: process.env.SENTRY_ENVIRONMENT || (isProduction ? 'production' : 'development'),
  get enabled() {
    return !!this.dsn
  },
}
