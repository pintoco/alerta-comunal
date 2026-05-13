import { getRedisClient } from './redis'

export interface RateLimitResult {
  allowed: boolean
  retryAfterSeconds?: number
}

// ─── In-memory fallback (single-instance / dev) ──────────────────────────────

interface RateLimitRecord {
  count: number
  resetAt: number
}

const memoryStore = new Map<string, RateLimitRecord>()

function checkMemory(key: string, maxAttempts: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const record = memoryStore.get(key)

  if (!record || now > record.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) }
  }

  record.count++
  return { allowed: true }
}

function resetMemory(key: string): void {
  memoryStore.delete(key)
}

// ─── Redis backend (multi-instance) ──────────────────────────────────────────

const REDIS_KEY_PREFIX = 'rl:'

/**
 * Atomic INCR + EXPIRE pattern:
 *   1. INCR key          → new count (key created with value 1 if missing)
 *   2. if count === 1    → PEXPIRE key windowMs  (set TTL only on first hit)
 *   3. if count > max    → PTTL key to compute retryAfter
 */
async function checkRedis(
  redisKey: string,
  maxAttempts: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient()!
  const count = await redis.incr(redisKey)

  if (count === 1) {
    await redis.pexpire(redisKey, windowMs)
  }

  if (count > maxAttempts) {
    const pttl = await redis.pttl(redisKey)
    const retryAfterSeconds = pttl > 0 ? Math.ceil(pttl / 1000) : Math.ceil(windowMs / 1000)
    return { allowed: false, retryAfterSeconds }
  }

  return { allowed: true }
}

async function resetRedis(redisKey: string): Promise<void> {
  await getRedisClient()!.del(redisKey)
}

// ─── Public API (unchanged interface) ────────────────────────────────────────

/**
 * @param key         Unique actor identifier (e.g. IP address)
 * @param maxAttempts Max attempts allowed within the window
 * @param windowMs    Window size in milliseconds
 *
 * Uses Redis when REDIS_URL is set (distributed, multi-instance safe).
 * Falls back to in-process memory when Redis is unavailable (dev / single-instance).
 */
export async function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const redis = getRedisClient()

  if (redis) {
    try {
      return await checkRedis(`${REDIS_KEY_PREFIX}${key}`, maxAttempts, windowMs)
    } catch (err) {
      console.error('[RateLimit] Redis error, falling back to memory:', (err as Error).message)
    }
  }

  return checkMemory(key, maxAttempts, windowMs)
}

/** Clears the counter for a key (call after successful login). */
export async function resetRateLimit(key: string): Promise<void> {
  const redis = getRedisClient()

  if (redis) {
    try {
      await resetRedis(`${REDIS_KEY_PREFIX}${key}`)
      return
    } catch (err) {
      console.error('[RateLimit] Redis error on reset, falling back to memory:', (err as Error).message)
    }
  }

  resetMemory(key)
}

/** Extracts the client IP from a standard Web API Request (API routes). */
export function getClientIpFromRequest(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}
