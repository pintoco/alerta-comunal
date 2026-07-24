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
