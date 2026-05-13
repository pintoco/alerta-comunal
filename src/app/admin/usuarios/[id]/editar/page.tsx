import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import UserForm from '@/components/admin/UserForm'

export const dynamic = 'force-dynamic'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN') redirect('/dashboard')
  if (session.role === 'ADMIN' && !session.municipalityId) redirect('/dashboard')

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, active: true, municipalityId: true,
      emailOnAssigned: true, emailOnNewReport: true,
      municipality: { select: { name: true } },
    },
  })

  if (!user) notFound()

  if (session.role === 'ADMIN') {
    // ADMIN can only edit OPERADOR/VISUALIZADOR of their own municipality
    if (
      user.municipalityId !== session.municipalityId ||
      !['OPERADOR', 'VISUALIZADOR'].includes(user.role)
    ) {
      redirect('/admin/usuarios')
    }
  }

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
            <span>{user.name}</span>
            <span>›</span>
            <span>Editar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Editar usuario</h1>
          <p className="text-gray-500 text-sm mt-1">{user.email}</p>
        </div>
        <div className="card p-6">
          <UserForm
            mode="edit"
            userId={user.id}
            initialData={{
              name: user.name,
              email: user.email,
              role: user.role,
              municipalityId: user.municipalityId,
              active: user.active,
              emailOnAssigned: user.emailOnAssigned,
              emailOnNewReport: user.emailOnNewReport,
            }}
            municipalities={municipalities}
            isSuperAdmin={isSuperAdmin}
            lockedMunicipalityId={isSuperAdmin ? null : session.municipalityId}
          />
        </div>
      </div>
    </MainLayout>
  )
}
