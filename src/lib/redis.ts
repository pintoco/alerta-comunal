import Redis from 'ioredis'

declare global {
  // eslint-disable-next-line no-var
  var _redisClient: Redis | null | undefined
}

/**
 * Returns a shared Redis client when REDIS_URL is configured, or null otherwise.
 * null = in-memory fallback is active (single-instance / dev mode).
 */
export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) return null

  if (!global._redisClient) {
    global._redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      enableOfflineQueue: true,
    })

    global._redisClient.on('error', (err) => {
      console.error('[Redis] connection error:', err.message)
    })

    global._redisClient.on('ready', () => {
      console.log('[Redis] connected')
    })
  }

  return global._redisClient
}
