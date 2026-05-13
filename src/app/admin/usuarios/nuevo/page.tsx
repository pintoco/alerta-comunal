import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import UserForm from '@/components/admin/UserForm'

export const dynamic = 'force-dynamic'

export default async function NuevoUsuarioPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') redirect('/dashboard')
  if (session.role === 'ADMIN' && !session.municipalityId) redirect('/dashboard')

  const isSuperAdmin = session.role === 'SUPER_ADMIN'

  const municipalities = isSuperAdmin
    ? await prisma.municipality.findMany({
        where: { active: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : await prisma.municipality.findUnique({
        where: { id: session.municipalityId! },
        select: { id: true, name: true },
      }).then((m) => (m ? [m] : []))

  return (
    <MainLayout>
      <div className="max-w-xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/admin" className="hover:text-blue-600">Administración</Link>
            <span>›</span>
            <Link href="/admin/usuarios" className="hover:text-blue-600">Usuarios</Link>
            <span>›</span>
            <span>Nuevo</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo usuario</h1>
          <p className="text-gray-500 text-sm mt-1">Crear usuario en la plataforma</p>
        </div>
        <div className="card p-6">
          <UserForm
            mode="create"
            municipalities={municipalities}
            isSuperAdmin={isSuperAdmin}
            lockedMunicipalityId={isSuperAdmin ? null : session.municipalityId}
          />
        </div>
      </div>
    </MainLayout>
  )
}
