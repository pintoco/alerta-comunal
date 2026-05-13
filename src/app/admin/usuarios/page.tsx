import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import UserToggle from '@/components/admin/UserToggle'

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin municipal',
  OPERADOR: 'Operador',
  VISUALIZADOR: 'Visualizador',
}

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  OPERADOR: 'bg-cyan-100 text-cyan-700',
  VISUALIZADOR: 'bg-gray-100 text-gray-600',
}

export default async function AdminUsuariosPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') redirect('/dashboard')
  if (session.role === 'ADMIN' && !session.municipalityId) redirect('/dashboard')

  const where: Record<string, unknown> = {}
  if (session.role === 'ADMIN') {
    where.municipalityId = session.municipalityId
    where.role = { in: ['OPERADOR', 'VISUALIZADOR'] }
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: {
      id: true, name: true, email: true, role: true, active: true,
      municipalityId: true,
      municipality: { select: { name: true } },
      createdAt: true,
    },
  })

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600">Administración</Link>
              <span>›</span>
              <span>Usuarios</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
            <p className="text-gray-500 text-sm mt-1">
              {users.length} {session.role === 'ADMIN' ? 'usuarios de tu municipalidad' : 'registrados'}
            </p>
          </div>
          <Link href="/admin/usuarios/nuevo" className="btn-primary inline-flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo usuario
          </Link>
        </div>

        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rol</th>
                {session.role === 'SUPER_ADMIN' && (
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Municipalidad</th>
                )}
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? 'opacity-60' : ''}`}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-gray-100'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  {session.role === 'SUPER_ADMIN' && (
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      {u.municipality?.name ?? <span className="text-gray-400 italic">Sin municipalidad</span>}
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <UserToggle id={u.id} active={u.active} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/admin/usuarios/${u.id}/editar`} className="text-blue-600 hover:underline text-xs">
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={session.role === 'SUPER_ADMIN' ? 5 : 4} className="px-6 py-8 text-center text-sm text-gray-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
