import * as Sentry from '@sentry/nextjs'
import { sentryConfig } from '@/lib/config'

Sentry.init({
  dsn: sentryConfig.dsn,
  environment: sentryConfig.environment,
  tracesSampleRate: 0.1,
})
