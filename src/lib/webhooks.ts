import crypto from 'crypto'
import { prisma } from './prisma'

export type WebhookEvent = 'EMERGENCY_CREATED' | 'EMERGENCY_ASSIGNED' | 'NEW_CITIZEN_REPORT' | 'TEST'

export interface WebhookResult {
  success: boolean
  error?: string
  /** true = no había webhook configurado/activo para este evento; no intentó enviar nada. */
  skipped?: boolean
}

const EVENT_FLAG: Record<Exclude<WebhookEvent, 'TEST'>, 'onEmergencyCreated' | 'onAssignment' | 'onNewCitizenReport'> = {
  EMERGENCY_CREATED: 'onEmergencyCreated',
  EMERGENCY_ASSIGNED: 'onAssignment',
  NEW_CITIZEN_REPORT: 'onNewCitizenReport',
}

export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString('hex')
}

function signPayload(body: string, secret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

// Guardia SSRF barata: la app corre en EC2 con metadata en 169.254.169.254 y el
// destino del webhook lo define un SUPER_ADMIN de confianza, pero igual vale
// bloquear hosts obviamente privados/locales a nivel de aplicación.
function isPrivateOrLocalHost(hostname: string): boolean {
  // URL.hostname keeps the brackets for IPv6 literals (e.g. "[::1]") — strip them
  // before comparing, or "https://[::1]/..." silently bypasses this check.
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (h === 'localhost' || h === '127.0.0.1' || h === '169.254.169.254' || h === '::1') return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  return false
}

export function validateWebhookUrl(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return 'URL inválida.'
  }
  if (parsed.protocol !== 'https:') return 'La URL debe usar https://.'
  if (isPrivateOrLocalHost(parsed.hostname)) return 'La URL no puede apuntar a un host privado o local.'
  return null
}

interface WebhookConfig {
  url: string
  secret: string
}

async function getActiveWebhookConfig(
  municipalityId: string | null | undefined,
  event: WebhookEvent,
): Promise<WebhookConfig | null> {
  if (!municipalityId) return null
  try {
    const cfg = await prisma.municipalityWebhook.findUnique({ where: { municipalityId } })
    if (!cfg) return null
    // TEST ignora enabled/flags: sirve para probar conectividad antes de activar el webhook.
    if (event !== 'TEST') {
      if (!cfg.enabled) return null
      if (!cfg[EVENT_FLAG[event]]) return null
    }
    return { url: cfg.url, secret: cfg.secret }
  } catch {
    return null
  }
}

/**
 * Envía un webhook firmado (HMAC-SHA256) para la municipalidad indicada.
 * Un solo intento, timeout de 5s, nunca lanza — si falla, el llamador decide
 * cómo registrarlo (ActivityLog/AuditLog), igual que con el correo.
 */
export async function sendWebhook(
  municipalityId: string | null | undefined,
  event: WebhookEvent,
  payload: Record<string, unknown>,
): Promise<WebhookResult> {
  const cfg = await getActiveWebhookConfig(municipalityId, event)
  if (!cfg) return { success: true, skipped: true }

  const urlError = validateWebhookUrl(cfg.url)
  if (urlError) return { success: false, error: urlError }

  const body = JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload })
  const signature = signPayload(body, cfg.secret)

  try {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AlertaComunal-Event': event,
        'X-AlertaComunal-Signature': signature,
      },
      body,
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      return { success: false, error: `El endpoint respondió ${res.status}` }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Error desconocido' }
  }
}
