import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import MunicipalityToggle from '@/components/admin/MunicipalityToggle'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
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
      _count: { select: { users: true, emergencies: true } },
      users: {
        select: { id: true, name: true, email: true, role: true, active: true },
        orderBy: { name: 'asc' },
      },
    },
  })

  if (!municipality) notFound()

  return (
    <MainLayout>
      <div className="space-y-6">
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
            <p className="text-gray-500 text-sm mt-1 font-mono">{municipality.slug}</p>
          </div>
          <div className="flex items-center gap-3">
            <MunicipalityToggle id={municipality.id} active={municipality.active} />
            <Link href={`/admin/municipalidades/${id}/editar`} className="btn-secondary text-sm">
              Editar
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Region', value: municipality.region || '—' },
            { label: 'Comuna', value: municipality.commune || '—' },
            { label: 'Usuarios', value: municipality._count.users },
            { label: 'Emergencias', value: municipality._count.emergencies },
          ].map((stat) => (
            <div key={stat.label} className="card p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">{stat.label}</p>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-900">
              Usuarios ({municipality.users.length})
            </h2>
            <Link
              href={`/admin/usuarios/nuevo?municipalityId=${id}`}
              className="text-sm text-blue-600 hover:underline"
            >
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
                    <Link href={`/admin/usuarios/${u.id}/editar`} className="text-blue-600 hover:underline text-xs">
                      Editar
                    </Link>
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
