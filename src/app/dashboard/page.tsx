import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import StatsCard from '@/components/dashboard/StatsCard'
import RecentEmergencies from '@/components/dashboard/RecentEmergencies'
import type { Emergency } from '@/types'

async function getDashboardData() {
  const [total, nueva, enAtencion, resuelta, cerrada, descartada, critica, recent] =
    await Promise.all([
      prisma.emergency.count(),
      prisma.emergency.count({ where: { status: 'NUEVA' } }),
      prisma.emergency.count({ where: { status: 'EN_ATENCION' } }),
      prisma.emergency.count({ where: { status: 'RESUELTA' } }),
      prisma.emergency.count({ where: { status: 'CERRADA' } }),
      prisma.emergency.count({ where: { status: 'DESCARTADA' } }),
      prisma.emergency.count({ where: { priority: 'CRITICA', status: { notIn: ['CERRADA', 'DESCARTADA'] } } }),
      prisma.emergency.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { assignedTo: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } } },
      }),
    ])

  return { total, nueva, enAtencion, resuelta, cerrada, descartada, critica, recent }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const data = await getDashboardData()

  const statsConfig = [
    {
      label: 'Total emergencias',
      value: data.total,
      color: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      label: 'Nuevas',
      value: data.nueva,
      color: 'blue' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'En atención',
      value: data.enAtencion,
      color: 'yellow' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Resueltas',
      value: data.resuelta,
      color: 'green' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      label: 'Cerradas',
      value: data.cerrada,
      color: 'gray' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Críticas activas',
      value: data.critica,
      color: 'red' as const,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ]

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Resumen del estado comunal</p>
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

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsConfig.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Últimas emergencias</h2>
            <Link href="/emergencias" className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <RecentEmergencies emergencies={data.recent as unknown as Emergency[]} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/emergencias" className="card p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-700 group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Emergencias</p>
                <p className="text-gray-500 text-xs">Ver y gestionar todas</p>
              </div>
            </div>
          </Link>

          <Link href="/mapa" className="card p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg text-green-700 group-hover:bg-green-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Mapa</p>
                <p className="text-gray-500 text-xs">Ver distribución geográfica</p>
              </div>
            </div>
          </Link>

          <Link href="/reportar" target="_blank" className="card p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg text-purple-700 group-hover:bg-purple-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Formulario público</p>
                <p className="text-gray-500 text-xs">Reporte ciudadano</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </MainLayout>
  )
}
