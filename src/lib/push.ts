import { prisma } from './prisma'

export interface PushNotificationPayload {
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface PushResult {
  success: boolean
  error?: string
  /** true = el usuario no tiene ningún dispositivo registrado; no intentó enviar nada. */
  skipped?: boolean
}

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send'

/**
 * Envía una notificación push (Expo Push Notification Service) a todos los
 * dispositivos registrados del usuario. Un solo intento, timeout de 5s,
 * nunca lanza — mismo contrato que sendWebhook/sendEmail: el llamador decide
 * cómo registrar el resultado (ActivityLog/AuditLog) y nunca bloquea la
 * operación principal.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload,
): Promise<PushResult> {
  const devices = await prisma.deviceToken.findMany({
    where: { userId },
    select: { token: true },
  })

  if (devices.length === 0) return { success: true, skipped: true }

  const messages = devices.map((d) => ({
    to: d.token,
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }))

  try {
    const res = await fetch(EXPO_PUSH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { success: false, error: `Expo Push respondió ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
