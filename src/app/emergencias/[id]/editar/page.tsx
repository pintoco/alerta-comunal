import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import MainLayout from '@/components/layout/MainLayout'
import EmergencyForm from '@/components/emergencies/EmergencyForm'

export default async function EditarEmergenciaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'VISUALIZADOR') redirect('/emergencias')

  const { id } = await params

  const [emergency, users] = await Promise.all([
    prisma.emergency.findUnique({ where: { id } }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!emergency) notFound()

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Editar emergencia</h1>
          <p className="font-mono text-sm text-gray-400 mt-1">{emergency.code}</p>
        </div>

        <EmergencyForm
          users={users}
          initial={emergency as any}
          isEdit
        />
      </div>
    </MainLayout>
  )
}
