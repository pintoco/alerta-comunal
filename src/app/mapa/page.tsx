import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import MapWrapper from '@/components/map/MapWrapper'
import type { Emergency } from '@/types'

export default async function MapaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const emergencies = await prisma.emergency.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      status: { notIn: ['CERRADA', 'DESCARTADA'] },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const allEmergencies = await prisma.emergency.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: { id: true },
  })

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mapa de emergencias</h1>
            <p className="text-gray-500 text-sm mt-1">
              Mostrando {emergencies.length} emergencias activas con ubicación georeferenciada
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-gray-600">Baja</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-gray-600">Media</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="text-gray-600">Alta</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-600">Crítica</span>
            </div>
          </div>
        </div>

        <MapWrapper
          emergencies={emergencies as unknown as Emergency[]}
          height="600px"
        />

        <div className="card p-4 text-sm text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Solo se muestran emergencias activas con coordenadas registradas. Haga clic en un marcador para ver el detalle.
            {allEmergencies.length > emergencies.length && (
              <> ({allEmergencies.length - emergencies.length} emergencias cerradas no mostradas)</>
            )}
          </span>
        </div>
      </div>
    </MainLayout>
  )
}
