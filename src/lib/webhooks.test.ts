import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./prisma', () => ({
  prisma: {
    municipalityWebhook: {
      findUnique: vi.fn(),
    },
  },
}))

const { prisma } = await import('./prisma')
const { validateWebhookUrl, generateWebhookSecret, sendWebhook } = await import('./webhooks')

describe('validateWebhookUrl — SSRF guard', () => {
  it('rejects a malformed URL', () => {
    expect(validateWebhookUrl('not a url')).toMatch(/inválida/)
  })

  it('rejects plain http (only https is allowed)', () => {
    expect(validateWebhookUrl('http://example.com/hook')).toMatch(/https/)
  })

  it.each(['localhost', '127.0.0.1', '169.254.169.254', '::1'])(
    'blocks exact-match local/metadata host %s',
    (host) => {
      const url = host === '::1' ? `https://[${host}]/hook` : `https://${host}/hook`
      expect(validateWebhookUrl(url)).toMatch(/privado o local/)
    }
  )

  it.each(['10.0.0.5', '10.255.255.255', '192.168.1.1', '172.16.0.1', '172.20.5.5', '172.31.255.255'])(
    'blocks RFC1918 private range %s',
    (host) => {
      expect(validateWebhookUrl(`https://${host}/hook`)).toMatch(/privado o local/)
    }
  )

  it.each(['172.15.255.255', '172.32.0.1'])(
    'does NOT block addresses just outside the 172.16-172.31 range: %s',
    (host) => {
      expect(validateWebhookUrl(`https://${host}/hook`)).toBeNull()
    }
  )

  it('is case-insensitive on hostname', () => {
    expect(validateWebhookUrl('https://LOCALHOST/hook')).toMatch(/privado o local/)
  })

  it('accepts a normal public https URL', () => {
    expect(validateWebhookUrl('https://example.com/webhooks/alertacomunal')).toBeNull()
  })
})

describe('generateWebhookSecret', () => {
  it('generates a 64-character hex string', () => {
    const secret = generateWebhookSecret()
    expect(secret).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates a different secret on every call', () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret())
  })
})

describe('sendWebhook', () => {
  beforeEach(() => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockReset()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is skipped (not a failure) when no municipalityId is provided', async () => {
    const result = await sendWebhook(null, 'EMERGENCY_CREATED', {})
    expect(result).toEqual({ success: true, skipped: true })
    expect(prisma.municipalityWebhook.findUnique).not.toHaveBeenCalled()
  })

  it('is skipped when no webhook is configured for the municipality', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue(null)
    const result = await sendWebhook('muni-1', 'EMERGENCY_CREATED', {})
    expect(result).toEqual({ success: true, skipped: true })
  })

  it('is skipped when the webhook is disabled', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: false,
      onEmergencyCreated: true,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    const result = await sendWebhook('muni-1', 'EMERGENCY_CREATED', {})
    expect(result).toEqual({ success: true, skipped: true })
  })

  it('is skipped when enabled but the specific event flag is off', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: true,
      onEmergencyCreated: false,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    const result = await sendWebhook('muni-1', 'EMERGENCY_CREATED', {})
    expect(result).toEqual({ success: true, skipped: true })
  })

  it('TEST events bypass enabled/flag checks (used to verify connectivity before activating)', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: false,
      onEmergencyCreated: false,
      onAssignment: false,
      onNewCitizenReport: false,
    } as any)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendWebhook('muni-1', 'TEST', {})
    expect(fetchMock).toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('fails without calling fetch when the configured URL fails SSRF validation', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'http://169.254.169.254/hook',
      secret: 'a'.repeat(64),
      enabled: true,
      onEmergencyCreated: true,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await sendWebhook('muni-1', 'EMERGENCY_CREATED', {})
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.success).toBe(false)
  })

  it('signs the payload with HMAC-SHA256 and sends the event/signature headers', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: true,
      onEmergencyCreated: true,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
    vi.stubGlobal('fetch', fetchMock)

    await sendWebhook('muni-1', 'EMERGENCY_CREATED', { emergency: { code: 'EMG-2026-0001' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.com/hook')
    expect(options.method).toBe('POST')
    expect(options.headers['X-AlertaComunal-Event']).toBe('EMERGENCY_CREATED')
    expect(options.headers['X-AlertaComunal-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/)
    expect(JSON.parse(options.body)).toMatchObject({ event: 'EMERGENCY_CREATED', emergency: { code: 'EMG-2026-0001' } })
  })

  it('reports failure (never throws) when the endpoint responds with a non-2xx status', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: true,
      onEmergencyCreated: true,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const result = await sendWebhook('muni-1', 'EMERGENCY_CREATED', {})
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/500/)
  })

  it('reports failure (never throws) when fetch itself rejects — e.g. timeout', async () => {
    vi.mocked(prisma.municipalityWebhook.findUnique).mockResolvedValue({
      url: 'https://example.com/hook',
      secret: 'a'.repeat(64),
      enabled: true,
      onEmergencyCreated: true,
      onAssignment: true,
      onNewCitizenReport: true,
    } as any)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))

    await expect(sendWebhook('muni-1', 'EMERGENCY_CREATED', {})).resolves.toMatchObject({
      success: false,
      error: 'timeout',
    })
  })
})
