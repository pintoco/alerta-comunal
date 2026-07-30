import { getSession } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import MainLayout from '@/components/layout/MainLayout'
import EmergencyForm from '@/components/emergencies/EmergencyForm'
import { canAccessEmergency } from '@/lib/tenant'

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

  const raw = await prisma.emergency.findUnique({
    where: { id },
    include: {
      coAssignees: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  })

  if (!raw) notFound()

  const { coAssignees: rawCo, ...emergencyRest } = raw
  const emergency = { ...emergencyRest, coAssignees: rawCo.map((ca) => ca.user) }

  if (!canAccessEmergency(session, emergencyRest.municipalityId)) {
    redirect('/emergencias')
  }

  // Usuarios filtrados por la municipalidad de LA EMERGENCIA, no por la del
  // usuario logueado — un SUPER_ADMIN no tiene municipalidad propia
  // (session.municipalityId es null), así que filtrar por su sesión nunca
  // aplicaba ningún filtro y mostraba usuarios de todas las municipalidades
  // como responsable/co-responsables. Para ADMIN/OPERADOR da el mismo
  // resultado que antes, ya que canAccessEmergency ya garantiza que
  // emergencyRest.municipalityId === session.municipalityId para ellos.
  const usersWhere: Record<string, unknown> = { active: true }
  if (emergencyRest.municipalityId) {
    usersWhere.municipalityId = emergencyRest.municipalityId
  }

  const users = await prisma.user.findMany({
    where: usersWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const categories = emergencyRest.municipalityId
    ? await prisma.emergencyCategory.findMany({
        where: { municipalityId: emergencyRest.municipalityId, active: true },
        select: { id: true, label: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
    : []

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Editar emergencia</h1>
          <p className="font-mono text-sm text-gray-400 mt-1">{emergency.code}</p>
        </div>

        <EmergencyForm
          users={users}
          categories={categories}
          initial={emergency as any}
          isEdit
        />
      </div>
    </MainLayout>
  )
}
