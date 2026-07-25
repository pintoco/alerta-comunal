import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Fijo en el commit de git: en producción hay 2+ instancias EC2 que
  // buildean el código de forma independiente (ver user_data.sh.tpl). El
  // BUILD_ID por defecto de Next.js es aleatorio por build, así que sin esto
  // cada instancia termina con nombres de chunk distintos para el mismo
  // código — y como el ALB no tiene sticky sessions, un navegador que cargó
  // el HTML de una instancia puede pedir un chunk (ej. el mapa, cargado con
  // next/dynamic ssr:false) a la otra instancia y recibir 404 en silencio.
  generateBuildId: async () => process.env.NEXT_BUILD_ID || 'dev',
}

export default withSentryConfig(nextConfig, {
  // Solo sube source maps si hay credenciales de Sentry (org/project/token) en
  // el entorno de build — sin ellas, el plugin de webpack se omite en silencio
  // y el build sigue funcionando igual que antes de agregar Sentry.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
})
