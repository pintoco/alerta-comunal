import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@/types'

vi.mock('./prisma', () => ({
  prisma: {
    emergency: {
      findUnique: vi.fn(),
    },
  },
}))

const { prisma } = await import('./prisma')
const {
  getMunicipalityFilter,
  requireMunicipalityAssigned,
  canAccessEmergency,
  getEmergencyScope,
  requireEmergencyAccess,
} = await import('./tenant')

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role: 'OPERADOR',
    municipalityId: 'muni-1',
    sessionVersion: 1,
    ...overrides,
  }
}

describe('getMunicipalityFilter', () => {
  it('SUPER_ADMIN gets no filter — sees every municipality', () => {
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    expect(getMunicipalityFilter(session)).toEqual({})
  })

  it('non-SUPER_ADMIN gets scoped to their own municipalityId', () => {
    const session = makeSession({ role: 'ADMIN', municipalityId: 'muni-1' })
    expect(getMunicipalityFilter(session)).toEqual({ municipalityId: 'muni-1' })
  })

  it('non-SUPER_ADMIN without a municipality gets a filter that matches nothing', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: null })
    expect(getMunicipalityFilter(session)).toEqual({ id: '__never__' })
  })
})

describe('requireMunicipalityAssigned', () => {
  it('SUPER_ADMIN always passes, even without a municipality', () => {
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    expect(requireMunicipalityAssigned(session)).toBeNull()
  })

  it('ADMIN/OPERADOR/VISUALIZADOR with a municipality pass', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: 'muni-1' })
    expect(requireMunicipalityAssigned(session)).toBeNull()
  })

  it('ADMIN/OPERADOR/VISUALIZADOR without a municipality get a 403', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: null })
    const result = requireMunicipalityAssigned(session)
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })
})

describe('canAccessEmergency — the core multi-tenant isolation check', () => {
  it('SUPER_ADMIN can access any municipality, including null', () => {
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    expect(canAccessEmergency(session, 'muni-1')).toBe(true)
    expect(canAccessEmergency(session, null)).toBe(true)
  })

  it('a user can access an emergency belonging to their own municipality', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: 'muni-1' })
    expect(canAccessEmergency(session, 'muni-1')).toBe(true)
  })

  it('a user CANNOT access an emergency belonging to a different municipality', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: 'muni-1' })
    expect(canAccessEmergency(session, 'muni-2')).toBe(false)
  })

  it('a user without a municipality can never access any emergency', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: null })
    expect(canAccessEmergency(session, 'muni-1')).toBe(false)
    expect(canAccessEmergency(session, null)).toBe(false)
  })
})

describe('getEmergencyScope', () => {
  it('SUPER_ADMIN gets an unrestricted scope', () => {
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    expect(getEmergencyScope(session)).toEqual({})
  })

  it('a regular user gets scoped to their municipality', () => {
    const session = makeSession({ role: 'VISUALIZADOR', municipalityId: 'muni-1' })
    expect(getEmergencyScope(session)).toEqual({ municipalityId: 'muni-1' })
  })

  it('a regular user without a municipality gets false (no valid scope)', () => {
    const session = makeSession({ role: 'VISUALIZADOR', municipalityId: null })
    expect(getEmergencyScope(session)).toBe(false)
  })
})

describe('requireEmergencyAccess (mocked prisma)', () => {
  beforeEach(() => {
    vi.mocked(prisma.emergency.findUnique).mockReset()
  })

  it('returns 404 when the emergency does not exist', async () => {
    vi.mocked(prisma.emergency.findUnique).mockResolvedValue(null)
    const session = makeSession({ role: 'ADMIN', municipalityId: 'muni-1' })
    const result = await requireEmergencyAccess(session, 'emg-1')
    expect((result as any).status).toBe(404)
  })

  it('returns 403 when the emergency belongs to a different municipality', async () => {
    vi.mocked(prisma.emergency.findUnique).mockResolvedValue({
      id: 'emg-1',
      municipalityId: 'muni-2',
    } as any)
    const session = makeSession({ role: 'ADMIN', municipalityId: 'muni-1' })
    const result = await requireEmergencyAccess(session, 'emg-1')
    expect((result as any).status).toBe(403)
  })

  it('returns the emergency when it belongs to the caller\'s municipality', async () => {
    vi.mocked(prisma.emergency.findUnique).mockResolvedValue({
      id: 'emg-1',
      municipalityId: 'muni-1',
    } as any)
    const session = makeSession({ role: 'ADMIN', municipalityId: 'muni-1' })
    const result = await requireEmergencyAccess(session, 'emg-1')
    expect(result).toEqual({ id: 'emg-1', municipalityId: 'muni-1' })
  })

  it('SUPER_ADMIN can access an emergency from any municipality', async () => {
    vi.mocked(prisma.emergency.findUnique).mockResolvedValue({
      id: 'emg-1',
      municipalityId: 'some-other-muni',
    } as any)
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    const result = await requireEmergencyAccess(session, 'emg-1')
    expect(result).toEqual({ id: 'emg-1', municipalityId: 'some-other-muni' })
  })
})
