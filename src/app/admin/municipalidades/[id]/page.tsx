import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import MunicipalityToggle from '@/components/admin/MunicipalityToggle'
import { formatDate } from '@/lib/utils'
import { EMERGENCY_TYPE_LABELS } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

const STATUS_BADGE: Record<string, string> = {
  NUEVA:       'bg-blue-100 text-blue-700',
  EN_ATENCION: 'bg-yellow-100 text-yellow-700',
  RESUELTA:    'bg-green-100 text-green-700',
  CERRADA:     'bg-gray-100 text-gray-600',
  DESCARTADA:  'bg-red-100 text-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  NUEVA: 'Nueva', EN_ATENCION: 'En atención',
  RESUELTA: 'Resuelta', CERRADA: 'Cerrada', DESCARTADA: 'Descartada',
}

const PRIORITY_COLOR: Record<string, string> = {
  BAJA: 'bg-green-500', MEDIA: 'bg-yellow-500',
  ALTA: 'bg-orange-500', CRITICA: 'bg-red-500',
}

export default async function MunicipalidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { id } = await params

  const municipality = await prisma.municipality.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, active: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!municipality) notFound()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalEmergencies,
    activeEmergencies,
    resolvedEmergencies,
    last30Days,
    closedWithDates,
    typeDistribution,
    activeUsersCount,
    recentEmergencies,
  ] = await Promise.all([
    prisma.emergency.count({ where: { municipalityId: id } }),
    prisma.emergency.count({ where: { municipalityId: id, status: { in: ['NUEVA', 'EN_ATENCION'] } } }),
    prisma.emergency.count({ where: { municipalityId: id, status: { in: ['RESUELTA', 'CERRADA'] } } }),
    prisma.emergency.count({ where: { municipalityId: id, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.emergency.findMany({
      where: { municipalityId: id, status: { in: ['RESUELTA', 'CERRADA'] }, closedAt: { not: null } },
      select: { createdAt: true, closedAt: true },
    }),
    prisma.emergency.groupBy({
      by: ['type'],
      where: { municipalityId: id },
      _count: { type: true },
      orderBy: { _count: { type: 'desc' } },
      take: 6,
    }),
    prisma.user.count({ where: { municipalityId: id, active: true } }),
    prisma.emergency.findMany({
      where: { municipalityId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, code: true, title: true, type: true, status: true, priority: true, createdAt: true },
    }),
  ])

  const resolutionRate = totalEmergencies > 0
    ? Math.round((resolvedEmergencies / totalEmergencies) * 100)
    : 0

  const avgCloseDays = closedWithDates.length > 0
    ? closedWithDates.reduce((sum, e) => {
        const ms = new Date(e.closedAt!).getTime() - new Date(e.createdAt).getTime()
        return sum + ms / (1000 * 60 * 60 * 24)
      }, 0) / closedWithDates.length
    : null

  const typeMax = typeDistribution[0]?._count.type ?? 1

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600">Administración</Link>
              <span>›</span>
              <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
              <span>›</span>
              <span>{municipality.name}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{municipality.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {[municipality.commune, municipality.region].filter(Boolean).join(' — ')}
              <span className="ml-2 font-mono text-xs text-gray-400">{municipality.slug}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <MunicipalityToggle id={municipality.id} active={municipality.active} />
            <Link href={`/admin/municipalidades/${id}/editar`} className="btn-secondary text-sm">Editar</Link>
          </div>
        </div>

        {/* KPI row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total emergencias</p>
            <p className="text-3xl font-bold text-gray-900">{totalEmergencies}</p>
          </div>
          <div className="card p-5 border-l-4 border-l-yellow-400">
            <p className="text-xs text-yellow-600 uppercase font-semibold mb-1">Activas ahora</p>
            <p className="text-3xl font-bold text-yellow-700">{activeEmergencies}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Últimos 30 días</p>
            <p className="text-3xl font-bold text-gray-900">{last30Days}</p>
          </div>
        </div>

        {/* KPI row 2 */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tasa de resolución</p>
            <p className="text-3xl font-bold text-gray-900">{resolutionRate}%</p>
            <p className="text-xs text-gray-400 mt-1">{resolvedEmergencies} resueltas / cerradas</p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Tiempo prom. cierre</p>
            {avgCloseDays !== null ? (
              <>
                <p className="text-3xl font-bold text-gray-900">{avgCloseDays.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-1">días promedio</p>
              </>
            ) : (
              <p className="text-xl font-bold text-gray-300 mt-2">—</p>
            )}
          </div>
          <div className="card p-5">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Usuarios activos</p>
            <p className="text-3xl font-bold text-gray-900">{activeUsersCount}</p>
            <p className="text-xs text-gray-400 mt-1">de {municipality.users.length} registrados</p>
          </div>
        </div>

        {/* Type distribution */}
        {typeDistribution.length > 0 && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Distribución por tipo de emergencia</h2>
            <div className="space-y-2.5">
              {typeDistribution.map((t) => {
                const pct = Math.round((t._count.type / typeMax) * 100)
                return (
                  <div key={t.type} className="flex items-center gap-3">
                    <span className="text-xs text-gray-600 w-44 shrink-0 truncate">
                      {EMERGENCY_TYPE_LABELS[t.type as keyof typeof EMERGENCY_TYPE_LABELS] ?? t.type}
                    </span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-6 text-right">{t._count.type}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent emergencies */}
        {recentEmergencies.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Emergencias recientes</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {recentEmergencies.map((em) => (
                <div key={em.id} className="px-6 py-3 flex items-center justify-between gap-4 text-sm hover:bg-gray-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PRIORITY_COLOR[em.priority] ?? 'bg-gray-400'}`} />
                    <span className="font-mono text-xs text-gray-400 shrink-0">{em.code}</span>
                    <span className="text-gray-800 truncate">{em.title}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-gray-400">{formatDate(em.createdAt)}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[em.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[em.status] ?? em.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Usuarios ({municipality.users.length})
            </h2>
            <Link href={`/admin/usuarios/nuevo?municipalityId=${id}`} className="text-sm text-blue-600 hover:underline">
              + Agregar usuario
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {municipality.users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-3 text-gray-500">{u.email}</td>
                  <td className="px-6 py-3 text-gray-600">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <Link href={`/admin/usuarios/${u.id}/editar`} className="text-blue-600 hover:underline text-xs">Editar</Link>
                  </td>
                </tr>
              ))}
              {municipality.users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">
                    No hay usuarios en esta municipalidad.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400">Creada: {formatDate(municipality.createdAt)}</p>
      </div>
    </MainLayout>
  )
}
