import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const [totalMunicipalities, activeMunicipalities, totalUsers, totalEmergencies] =
    await Promise.all([
      prisma.municipality.count(),
      prisma.municipality.count({ where: { active: true } }),
      prisma.user.count(),
      prisma.emergency.count(),
    ])

  const recentMunicipalities = await prisma.municipality.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { users: true, emergencies: true } } },
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión global de la plataforma AlertaComunal</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Vista global de plataforma — accediendo como <strong className="ml-1">Super Administrador</strong>
        </div>

        {/* Métricas globales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Municipalidades', value: totalMunicipalities, color: 'bg-blue-50 text-blue-700', icon: '🏛️' },
            { label: 'Activas', value: activeMunicipalities, color: 'bg-green-50 text-green-700', icon: '✓' },
            { label: 'Usuarios totales', value: totalUsers, color: 'bg-indigo-50 text-indigo-700', icon: '👥' },
            { label: 'Emergencias totales', value: totalEmergencies, color: 'bg-orange-50 text-orange-700', icon: '⚠' },
          ].map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/municipalidades" className="card p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-700 group-hover:bg-blue-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Municipalidades</p>
                <p className="text-gray-500 text-xs">{totalMunicipalities} registradas · Crear, editar, activar/desactivar</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/usuarios" className="card p-6 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-700 group-hover:bg-indigo-100 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-900">Usuarios</p>
                <p className="text-gray-500 text-xs">{totalUsers} registrados · Crear, editar, roles, contraseñas</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Municipalidades recientes */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">Municipalidades recientes</h2>
            <Link href="/admin/municipalidades" className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentMunicipalities.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name}</p>
                  <p className="text-xs text-gray-500">
                    {[m.commune, m.region].filter(Boolean).join(' — ') || m.slug}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{m._count.users} usuarios</span>
                  <span>{m._count.emergencies} emergencias</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    m.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.active ? 'Activa' : 'Inactiva'}
                  </span>
                  <Link href={`/admin/municipalidades/${m.id}`} className="text-blue-600 hover:underline">
                    Ver →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
