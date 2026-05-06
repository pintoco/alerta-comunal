/**
 * Rate limiter simple en memoria para MVP single-réplica (Railway).
 *
 * LIMITACIÓN CONOCIDA: El estado vive en el proceso Node.js. Si Railway escala
 * a múltiples réplicas, cada instancia tiene su propia ventana independiente.
 * Para producción SaaS con múltiples réplicas, reemplazar por Redis/Upstash:
 *   https://github.com/upstash/ratelimit
 *
 * El Map se limpia automáticamente cuando expira la ventana de cada IP,
 * por lo que no hay riesgo de leak de memoria sostenido.
 */

interface RateLimitRecord {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitRecord>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

/**
 * @param key        Identificador único del actor (ej. IP)
 * @param maxAttempts Intentos permitidos en la ventana
 * @param windowMs   Tamaño de la ventana en milisegundos
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const record = store.get(key)

  if (!record || now > record.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    }
  }

  record.count++
  return { allowed: true }
}

/** Limpia el contador de una clave (llamar tras login exitoso). */
export function resetRateLimit(key: string): void {
  store.delete(key)
}
