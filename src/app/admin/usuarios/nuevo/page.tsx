import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import UserForm from '@/components/admin/UserForm'

export const dynamic = 'force-dynamic'

export default async function NuevoUsuarioPage({
  searchParams,
}: {
  searchParams: Promise<{ municipalityId?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const municipalities = await prisma.municipality.findMany({
    where: { active: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

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
          <UserForm mode="create" municipalities={municipalities} />
        </div>
      </div>
    </MainLayout>
  )
}
