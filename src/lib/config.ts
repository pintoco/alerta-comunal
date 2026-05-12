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

export const emailConfig = {
  enabled: process.env.EMAIL_ENABLED === 'true',
  apiKey: process.env.RESEND_API_KEY || '',
  from: process.env.EMAIL_FROM || 'tecnico@elementalpro.cl',
}
