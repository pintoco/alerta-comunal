import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import MainLayout from '@/components/layout/MainLayout'
import EmergencyForm from '@/components/emergencies/EmergencyForm'

export const dynamic = 'force-dynamic'

export default async function NuevaEmergenciaPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role === 'VISUALIZADOR') redirect('/dashboard')

  // Misma resolución de municipalidad que usa POST /api/emergencias: la
  // sesión, o "demo" para SUPER_ADMIN (que no tiene municipalidad propia) —
  // las categorías mostradas deben ser las de la municipalidad donde la
  // emergencia realmente va a quedar creada.
  let effectiveMunicipalityId = session.municipalityId ?? null
  if (!effectiveMunicipalityId && session.role === 'SUPER_ADMIN') {
    const demo = await prisma.municipality.findFirst({ where: { slug: 'demo' }, select: { id: true } })
    effectiveMunicipalityId = demo?.id ?? null
  }

  // SUPER_ADMIN ve todos los usuarios de todas las municipalidades (sin
  // filtro). El resto de roles se restringe a su propia municipalidad y
  // además nunca debe ver al SUPER_ADMIN como opción de responsable/
  // co-responsable — no gestiona emergencias ni pertenece a ninguna
  // municipalidad.
  const usersWhere: Record<string, unknown> = { active: true }
  if (session.role !== 'SUPER_ADMIN') {
    usersWhere.municipalityId = effectiveMunicipalityId
    usersWhere.role = { not: 'SUPER_ADMIN' }
  }

  const users = await prisma.user.findMany({
    where: usersWhere,
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const categories = effectiveMunicipalityId
    ? await prisma.emergencyCategory.findMany({
        where: { municipalityId: effectiveMunicipalityId, active: true },
        select: { id: true, label: true },
        orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      })
    : []

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Nueva emergencia</h1>
          <p className="text-gray-500 text-sm mt-1">Complete los datos para registrar una nueva emergencia</p>
        </div>

        <EmergencyForm users={users} categories={categories} />
      </div>
    </MainLayout>
  )
}
