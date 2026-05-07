import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import StatsCard from '@/components/dashboard/StatsCard'
import RecentEmergencies from '@/components/dashboard/RecentEmergencies'
import type { Emergency, Session } from '@/types'
import { getEmergencyScope } from '@/lib/tenant'
import { EMERGENCY_TYPE_LABELS, PRIORITY_LABELS } from '@/lib/utils'
import type { EmergencyType, Priority } from '@/types'

export const dynamic = 'force-dynamic'

const PRIORITY_BAR_COLORS: Record<string, string> = {
  CRITICA: 'bg-red-500',
  ALTA: 'bg-orange-500',
  MEDIA: 'bg-yellow-400',
  BAJA: 'bg-green-500',
}

async function getDashboardData(session: Session) {
  const scope = getEmergencyScope(session)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  if (scope === false) {
    return {
      total: 0, nueva: 0, enAtencion: 0, resuelta: 0, cerrada: 0, descartada: 0,
      critica: 0, last7days: 0, closedLast7days: 0, resolvedPercent: 0,
      avgClosureDays: null as number | null,
      byType: [] as Array<{ type: string; count: number }>,
      byPriority: [] as Array<{ priority: string; count: number }>,
      recent: [],
      noMunicipality: true,
    }
  }

  const [
    total, nueva, enAtencion, resuelta, cerrada, descartada, critica,
    last7days, closedLast7days, byTypeRaw, byPriorityRaw, closedWithDates, recent,
  ] = await Promise.all([
    prisma.emergency.count({ where: scope }),
    prisma.emergency.count({ where: { ...scope, status: 'NUEVA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'EN_ATENCION' } }),
    prisma.emergency.count({ where: { ...scope, status: 'RESUELTA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'CERRADA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'DESCARTADA' } }),
    prisma.emergency.count({
      where: { ...scope, priority: 'CRITICA', status: { notIn: ['CERRADA', 'DESCARTADA'] } },
    }),
    prisma.emergency.count({ where: { ...scope, createdAt: { gte: sevenDaysAgo } } }),
    prisma.emergency.count({
      where: { ...scope, closedAt: { gte: sevenDaysAgo, not: null } },
    }),
    prisma.emergency.groupBy({
      by: ['type'],
      where: scope,
      _count: { _all: true },
      orderBy: { _count: { type: 'desc' } },
    }),
    prisma.emergency.groupBy({
      by: ['priority'],
      where: scope,
      _count: { _all: true },
    }),
    prisma.emergency.findMany({
      where: { ...scope, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    }),
    prisma.emergency.findMany({
      where: scope,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        },
      },
    }),
  ])

  const resolvedPercent = total > 0 ? Math.round(((resuelta + cerrada) / total) * 100) : 0

  let avgClosureDays: number | null = null
  if (closedWithDates.length > 0) {
    const totalMs = closedWithDates.reduce((acc, e) => {
      if (!e.closedAt) return acc
      return acc + (e.closedAt.getTime() - e.createdAt.getTime())
    }, 0)
    avgClosureDays = Math.round((totalMs / closedWithDates.length / (1000 * 60 * 60 * 24)) * 10) / 10
  }

  const byType = byTypeRaw.map((r) => ({ type: r.type, count: r._count._all }))
  const byPriority = byPriorityRaw.map((r) => ({ priority: r.priority, count: r._count._all }))

  return {
    total, nueva, enAtencion, resuelta, cerrada, descartada, critica,
    last7days, closedLast7days, resolvedPercent, avgClosureDays,
    byType, byPriority, recent, noMunicipality: false,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const data = await getDashboardData(session)

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

  const maxTypeCount = Math.max(...data.byType.map((t) => t.count), 1)
  const priorityOrder: Priority[] = ['CRITICA', 'ALTA', 'MEDIA', 'BAJA']

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Resumen ejecutivo del estado comunal</p>
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

        {data.noMunicipality && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Este usuario no tiene municipalidad asignada. Contacte a un administrador.
          </div>
        )}

        {/* Tarjetas principales */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statsConfig.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>

        {/* Métricas secundarias */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Últimos 7 días</p>
            <p className="text-3xl font-bold text-blue-600">{data.last7days}</p>
            <p className="text-xs text-gray-400 mt-1">Nuevas emergencias</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Cerradas (7 días)</p>
            <p className="text-3xl font-bold text-green-600">{data.closedLast7days}</p>
            <p className="text-xs text-gray-400 mt-1">Casos resueltos</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">% Resueltas</p>
            <p className="text-3xl font-bold text-indigo-600">{data.resolvedPercent}%</p>
            <p className="text-xs text-gray-400 mt-1">Del total registrado</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tiempo promedio</p>
            <p className="text-3xl font-bold text-purple-600">
              {data.avgClosureDays !== null ? `${data.avgClosureDays}d` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-1">Días hasta cierre</p>
          </div>
        </div>

        {/* Distribución por tipo y prioridad */}
        {data.total > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por tipo */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Por tipo de emergencia</h2>
              {data.byType.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {data.byType.slice(0, 8).map((item) => (
                    <div key={item.type}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{EMERGENCY_TYPE_LABELS[item.type as EmergencyType] ?? item.type}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full transition-all"
                          style={{ width: `${(item.count / maxTypeCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por prioridad */}
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Por prioridad</h2>
              {data.byPriority.length === 0 ? (
                <p className="text-sm text-gray-400">Sin datos</p>
              ) : (
                <div className="space-y-4">
                  {priorityOrder.map((priority) => {
                    const item = data.byPriority.find((p) => p.priority === priority)
                    const count = item?.count ?? 0
                    const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0
                    return (
                      <div key={priority}>
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{PRIORITY_LABELS[priority]}</span>
                          <span className="font-semibold">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${PRIORITY_BAR_COLORS[priority] ?? 'bg-gray-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Últimas emergencias */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Últimas emergencias</h2>
            <Link href="/emergencias" className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <RecentEmergencies emergencies={data.recent as unknown as Emergency[]} />
        </div>

        {/* Accesos rápidos */}
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
