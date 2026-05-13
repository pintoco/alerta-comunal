import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'

export const dynamic = 'force-dynamic'
import EmergencyTable from '@/components/emergencies/EmergencyTable'
import EmergencyFilters from '@/components/emergencies/EmergencyFilters'
import { Suspense } from 'react'
import Loading from '@/components/ui/Loading'
import type { Emergency, Session } from '@/types'
import { getEmergencyScope } from '@/lib/tenant'

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    type?: string
    sector?: string
    desde?: string
    hasta?: string
    page?: string
  }>
}

async function EmergencyList({
  searchParams,
  canEdit,
  session,
}: {
  searchParams: Awaited<PageProps['searchParams']>
  canEdit: boolean
  session: Session
}) {
  const scope = getEmergencyScope(session)

  if (scope === false) {
    return (
      <div className="card p-8 text-center text-gray-500 text-sm">
        Este usuario no tiene municipalidad asignada. Contacte a un administrador.
      </div>
    )
  }

  const where: Record<string, unknown> = { ...scope }

  if (searchParams.search) {
    where.OR = [
      { code: { contains: searchParams.search, mode: 'insensitive' } },
      { title: { contains: searchParams.search, mode: 'insensitive' } },
      { address: { contains: searchParams.search, mode: 'insensitive' } },
      { reporterName: { contains: searchParams.search, mode: 'insensitive' } },
    ]
  }
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.priority) where.priority = searchParams.priority
  if (searchParams.type) where.type = searchParams.type
  if (searchParams.sector) where.sector = { contains: searchParams.sector, mode: 'insensitive' }

  if (searchParams.desde || searchParams.hasta) {
    const createdAt: Record<string, Date> = {}
    if (searchParams.desde) {
      const d = new Date(searchParams.desde)
      if (!isNaN(d.getTime())) createdAt.gte = d
    }
    if (searchParams.hasta) {
      const d = new Date(searchParams.hasta)
      if (!isNaN(d.getTime())) { d.setHours(23, 59, 59, 999); createdAt.lte = d }
    }
    if (Object.keys(createdAt).length > 0) where.createdAt = createdAt
  }

  const rawPage = parseInt(searchParams.page || '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const skip = (page - 1) * PAGE_SIZE

  const [emergencies, total] = await Promise.all([
    prisma.emergency.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.emergency.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Build URL helper preserving current filters
  const buildPageUrl = (p: number) => {
    const params = new URLSearchParams()
    if (searchParams.search) params.set('search', searchParams.search)
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.priority) params.set('priority', searchParams.priority)
    if (searchParams.type) params.set('type', searchParams.type)
    if (searchParams.sector) params.set('sector', searchParams.sector)
    if (searchParams.desde) params.set('desde', searchParams.desde)
    if (searchParams.hasta) params.set('hasta', searchParams.hasta)
    params.set('page', String(p))
    return `/emergencias?${params.toString()}`
  }

  return (
    <div className="space-y-4">
      <EmergencyTable emergencies={emergencies as unknown as Emergency[]} canEdit={canEdit} />
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Mostrando {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} de {total} emergencias
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildPageUrl(page - 1)}
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                ← Anterior
              </Link>
            )}
            <span className="px-3 py-1.5 text-gray-600">
              Página {page} de {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={buildPageUrl(page + 1)}
                className="px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700"
              >
                Siguiente →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default async function EmergenciasPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams
  const canEdit = session.role !== 'VISUALIZADOR'

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergencias</h1>
            <p className="text-gray-500 text-sm mt-1">Listado y gestión de emergencias comunales</p>
          </div>
          {canEdit && (
            <Link href="/emergencias/nueva" className="btn-primary inline-flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nueva emergencia
            </Link>
          )}
        </div>

        <Suspense fallback={<div className="card p-4 h-16 bg-gray-50 animate-pulse rounded-lg" />}>
          <EmergencyFilters />
        </Suspense>

        <Suspense fallback={<Loading text="Cargando emergencias..." />}>
          <EmergencyList searchParams={params} canEdit={canEdit} session={session} />
        </Suspense>
      </div>
    </MainLayout>
  )
}
