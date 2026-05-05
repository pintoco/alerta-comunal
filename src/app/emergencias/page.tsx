import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import EmergencyTable from '@/components/emergencies/EmergencyTable'
import EmergencyFilters from '@/components/emergencies/EmergencyFilters'
import { Suspense } from 'react'
import Loading from '@/components/ui/Loading'
import type { Emergency } from '@/types'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    priority?: string
    type?: string
    sector?: string
  }>
}

async function EmergencyList({ searchParams }: { searchParams: Awaited<PageProps['searchParams']> }) {
  const where: Record<string, unknown> = {}

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

  const emergencies = await prisma.emergency.findMany({
    where,
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return <EmergencyTable emergencies={emergencies as unknown as Emergency[]} />
}

export default async function EmergenciasPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (!session) redirect('/login')

  const params = await searchParams

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Emergencias</h1>
            <p className="text-gray-500 text-sm mt-1">Listado y gestión de emergencias comunales</p>
          </div>
          {session.role !== 'VISUALIZADOR' && (
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
          <EmergencyList searchParams={params} />
        </Suspense>
      </div>
    </MainLayout>
  )
}
