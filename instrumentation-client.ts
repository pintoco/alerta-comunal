import * as Sentry from '@sentry/nextjs'
import { sentryConfig } from '@/lib/config'

Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  tracesSampleRate: 0.1,
  // Session Replay solo en errores, para no gastar cuota en sesiones normales.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [Sentry.replayIntegration()],
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
