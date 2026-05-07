import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import MainLayout from '@/components/layout/MainLayout'
import EmergencyForm from '@/components/emergencies/EmergencyForm'
import { canAccessEmergency, getEmergencyScope } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export default async function EditarEmergenciaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'VISUALIZADOR') redirect('/emergencias')

  const { id } = await params

  const emergency = await prisma.emergency.findUnique({ where: { id } })

  if (!emergency) notFound()

  if (!canAccessEmergency(session, emergency.municipalityId)) {
    redirect('/emergencias')
  }

  // Usuarios filtrados por municipalidad del usuario (ADMIN ve todos)
  const scope = getEmergencyScope(session)
  const usersWhere: Record<string, unknown> = { active: true }
  if (scope !== false && Object.keys(scope).length > 0) {
    usersWhere.municipalityId = session.municipalityId
  }

  const users = await prisma.user.findMany({
    where: usersWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

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
