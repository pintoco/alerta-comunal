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

  // SUPER_ADMIN ve todos los usuarios de todas las municipalidades (sin
  // filtro). El resto de roles se restringe a la municipalidad de LA
  // EMERGENCIA (canAccessEmergency ya garantiza que coincide con la suya) y
  // además nunca debe ver al SUPER_ADMIN como opción de responsable/
  // co-responsable — no gestiona emergencias ni pertenece a ninguna
  // municipalidad.
  const usersWhere: Record<string, unknown> = { active: true }
  if (session.role !== 'SUPER_ADMIN') {
    usersWhere.municipalityId = emergencyRest.municipalityId
    usersWhere.role = { not: 'SUPER_ADMIN' }
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
