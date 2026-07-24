import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session, UserRole } from '@/types'

vi.mock('./auth', () => ({
  getSession: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

const { getSession } = await import('./auth')
const { prisma } = await import('./prisma')
const {
  requireAuth,
  requireSuperAdmin,
  requireUserAdmin,
  requireRole,
  isSuperAdmin,
  isMunicipalityAdmin,
  isViewer,
  canManageMunicipalities,
  canManageUsers,
  canManageUsersInMunicipality,
  canManageEmergencies,
  MANAGE_ROLES,
  ADMIN_ASSIGNABLE_ROLES,
} = await import('./permissions')

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

describe('requireRole (pure)', () => {
  it('allows a role present in the list', () => {
    const session = makeSession({ role: 'ADMIN' })
    expect(requireRole(session, ['ADMIN', 'SUPER_ADMIN'])).toBeNull()
  })

  it('rejects a role absent from the list with a 403', async () => {
    const session = makeSession({ role: 'VISUALIZADOR' })
    const result = requireRole(session, ['ADMIN', 'SUPER_ADMIN'])
    expect(result).not.toBeNull()
    expect(result!.status).toBe(403)
  })
})

describe('role predicate helpers (pure)', () => {
  it.each<[UserRole, boolean]>([
    ['SUPER_ADMIN', true],
    ['ADMIN', false],
    ['OPERADOR', false],
    ['VISUALIZADOR', false],
  ])('isSuperAdmin(%s) === %s', (role, expected) => {
    expect(isSuperAdmin(makeSession({ role }))).toBe(expected)
  })

  it.each<[UserRole, boolean]>([
    ['SUPER_ADMIN', false],
    ['ADMIN', true],
    ['OPERADOR', false],
    ['VISUALIZADOR', false],
  ])('isMunicipalityAdmin(%s) === %s', (role, expected) => {
    expect(isMunicipalityAdmin(makeSession({ role }))).toBe(expected)
  })

  it.each<[UserRole, boolean]>([
    ['SUPER_ADMIN', false],
    ['ADMIN', false],
    ['OPERADOR', false],
    ['VISUALIZADOR', true],
  ])('isViewer(%s) === %s', (role, expected) => {
    expect(isViewer(makeSession({ role }))).toBe(expected)
  })

  it('only SUPER_ADMIN can manage municipalities', () => {
    expect(canManageMunicipalities(makeSession({ role: 'SUPER_ADMIN' }))).toBe(true)
    expect(canManageMunicipalities(makeSession({ role: 'ADMIN' }))).toBe(false)
  })

  it('SUPER_ADMIN and ADMIN can manage users, OPERADOR/VISUALIZADOR cannot', () => {
    expect(canManageUsers(makeSession({ role: 'SUPER_ADMIN' }))).toBe(true)
    expect(canManageUsers(makeSession({ role: 'ADMIN' }))).toBe(true)
    expect(canManageUsers(makeSession({ role: 'OPERADOR' }))).toBe(false)
    expect(canManageUsers(makeSession({ role: 'VISUALIZADOR' }))).toBe(false)
  })

  it('SUPER_ADMIN, ADMIN and OPERADOR can manage emergencies, VISUALIZADOR cannot', () => {
    expect(canManageEmergencies(makeSession({ role: 'SUPER_ADMIN' }))).toBe(true)
    expect(canManageEmergencies(makeSession({ role: 'ADMIN' }))).toBe(true)
    expect(canManageEmergencies(makeSession({ role: 'OPERADOR' }))).toBe(true)
    expect(canManageEmergencies(makeSession({ role: 'VISUALIZADOR' }))).toBe(false)
  })

  it('MANAGE_ROLES and ADMIN_ASSIGNABLE_ROLES match documented scope', () => {
    expect(MANAGE_ROLES).toEqual(['SUPER_ADMIN', 'ADMIN', 'OPERADOR'])
    expect(ADMIN_ASSIGNABLE_ROLES).toEqual(['OPERADOR', 'VISUALIZADOR'])
  })
})

describe('canManageUsersInMunicipality (pure)', () => {
  it('SUPER_ADMIN can manage any municipality', () => {
    const session = makeSession({ role: 'SUPER_ADMIN', municipalityId: null })
    expect(canManageUsersInMunicipality(session, 'any-muni')).toBe(true)
  })

  it('ADMIN can only manage their own municipality', () => {
    const session = makeSession({ role: 'ADMIN', municipalityId: 'muni-1' })
    expect(canManageUsersInMunicipality(session, 'muni-1')).toBe(true)
    expect(canManageUsersInMunicipality(session, 'muni-2')).toBe(false)
  })

  it('OPERADOR/VISUALIZADOR can never manage users', () => {
    const session = makeSession({ role: 'OPERADOR', municipalityId: 'muni-1' })
    expect(canManageUsersInMunicipality(session, 'muni-1')).toBe(false)
  })
})

describe('requireAuth (mocked getSession + prisma)', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset()
    vi.mocked(prisma.user.findUnique).mockReset()
  })

  it('returns 401 when there is no session', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const result = await requireAuth()
    expect((result as any).status).toBe(401)
  })

  it('returns 401 when the user no longer exists or is inactive', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession())
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as any)
    const result = await requireAuth()
    expect((result as any).status).toBe(401)
  })

  it('returns 401 when sessionVersion is stale (password/role changed since login)', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ sessionVersion: 1 }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'OPERADOR',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 2,
      municipality: { active: true },
    } as any)
    const result = await requireAuth()
    expect((result as any).status).toBe(401)
  })

  it('rebuilds the session from fresh DB values, not the stale JWT payload', async () => {
    // JWT claims OPERADOR, but the DB now says this user was promoted to ADMIN —
    // requireAuth must trust the DB, not the token.
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'OPERADOR', sessionVersion: 1 }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'ADMIN',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 1,
      municipality: { active: true },
    } as any)
    const result = await requireAuth()
    expect(result).toMatchObject({ role: 'ADMIN', municipalityId: 'muni-1' })
  })

  it('returns 403 when the municipality itself was deactivated', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'OPERADOR' }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'OPERADOR',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 1,
      municipality: { active: false },
    } as any)
    const result = await requireAuth()
    expect((result as any).status).toBe(403)
  })
})

describe('requireSuperAdmin (mocked getSession + prisma)', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset()
    vi.mocked(prisma.user.findUnique).mockReset()
  })

  it('checks role against the DB, not the JWT — a demoted SUPER_ADMIN loses access immediately', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'SUPER_ADMIN', municipalityId: null }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'ADMIN', // demoted in the DB after the JWT was issued
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 1,
    } as any)
    const result = await requireSuperAdmin()
    expect((result as any).status).toBe(403)
  })

  it('allows a genuine SUPER_ADMIN through', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'SUPER_ADMIN', municipalityId: null }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'SUPER_ADMIN',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: null,
      sessionVersion: 1,
    } as any)
    const result = await requireSuperAdmin()
    expect(result).toMatchObject({ role: 'SUPER_ADMIN' })
  })
})

describe('requireUserAdmin (mocked getSession + prisma)', () => {
  beforeEach(() => {
    vi.mocked(getSession).mockReset()
    vi.mocked(prisma.user.findUnique).mockReset()
  })

  it('rejects OPERADOR/VISUALIZADOR with 403', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'OPERADOR' }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'OPERADOR',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 1,
      municipality: { active: true },
    } as any)
    const result = await requireUserAdmin()
    expect((result as any).status).toBe(403)
  })

  it('rejects an ADMIN without a municipality assigned', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'ADMIN', municipalityId: null }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'ADMIN',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: null,
      sessionVersion: 1,
      municipality: null,
    } as any)
    const result = await requireUserAdmin()
    expect((result as any).status).toBe(403)
  })

  it('allows ADMIN with a municipality assigned', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession({ role: 'ADMIN', municipalityId: 'muni-1' }))
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      active: true,
      role: 'ADMIN',
      name: 'Test User',
      email: 'user@example.com',
      municipalityId: 'muni-1',
      sessionVersion: 1,
      municipality: { active: true },
    } as any)
    const result = await requireUserAdmin()
    expect(result).toMatchObject({ role: 'ADMIN', municipalityId: 'muni-1' })
  })
})
