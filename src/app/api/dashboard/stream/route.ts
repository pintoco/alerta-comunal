import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

const REFRESH_INTERVAL_MS = 30_000
const KEEPALIVE_INTERVAL_MS = 20_000

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return new Response('No autorizado', { status: 401 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false

      const enqueue = (event: string, data: unknown) => {
        if (closed) return
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      const close = () => {
        if (closed) return
        closed = true
        clearInterval(refreshTimer)
        clearInterval(keepaliveTimer)
        try { controller.close() } catch { /* already closed */ }
      }

      request.signal.addEventListener('abort', close)

      // Send initial snapshot immediately
      try {
        const data = await getDashboardData(session)
        enqueue('stats', data)
      } catch {
        close()
        return
      }

      // Keepalive ping so Railway/proxies don't cut the connection
      const keepaliveTimer = setInterval(() => {
        if (closed) return
        controller.enqueue(encoder.encode(': keepalive\n\n'))
      }, KEEPALIVE_INTERVAL_MS)

      // Periodic data refresh
      const refreshTimer = setInterval(async () => {
        if (closed) return
        try {
          const data = await getDashboardData(session)
          enqueue('stats', data)
        } catch {
          close()
        }
      }, REFRESH_INTERVAL_MS)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
