import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import MunicipalityToggle from '@/components/admin/MunicipalityToggle'

export const dynamic = 'force-dynamic'

export default async function MunicipalidadesPage() {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const [municipalities, activeByMuni] = await Promise.all([
    prisma.municipality.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true, emergencies: true } } },
    }),
    prisma.emergency.groupBy({
      by: ['municipalityId'],
      where: { status: { in: ['NUEVA', 'EN_ATENCION'] }, municipalityId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const activeMap = new Map(activeByMuni.map((a) => [a.municipalityId!, a._count._all]))

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600">Administración</Link>
              <span>›</span>
              <span>Municipalidades</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Municipalidades</h1>
            <p className="text-gray-500 text-sm mt-1">{municipalities.length} registradas</p>
          </div>
          <Link href="/admin/municipalidades/nueva" className="btn-primary inline-flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva municipalidad
          </Link>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipalidad</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Slug</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuarios</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total emerg.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-yellow-600 uppercase tracking-wide">Activas</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {municipalities.map((m) => {
                const activas = activeMap.get(m.id) ?? 0
                return (
                  <tr key={m.id} className={`hover:bg-gray-50 ${!m.active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      {(m.commune || m.region) && (
                        <p className="text-xs text-gray-400">{[m.commune, m.region].filter(Boolean).join(', ')}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{m.slug}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{m._count.users}</td>
                    <td className="px-4 py-4 text-center text-gray-600">{m._count.emergencies}</td>
                    <td className="px-4 py-4 text-center">
                      {activas > 0 ? (
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">
                          {activas}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <MunicipalityToggle id={m.id} active={m.active} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/municipalidades/${m.id}`} className="text-blue-600 hover:underline text-xs">Ver</Link>
                        <Link href={`/admin/municipalidades/${m.id}/editar`} className="text-blue-600 hover:underline text-xs">Editar</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {municipalities.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No hay municipalidades registradas.{' '}
              <Link href="/admin/municipalidades/nueva" className="text-blue-600 hover:underline">Crear una</Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
