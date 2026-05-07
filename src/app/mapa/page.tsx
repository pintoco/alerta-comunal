import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import MapWrapper from '@/components/map/MapWrapper'
import type { Emergency } from '@/types'
import { getEmergencyScope } from '@/lib/tenant'

export default async function MapaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const scope = getEmergencyScope(session)

  const geoBase: Record<string, unknown> = {
    ...(scope !== false ? scope : {}),
    latitude: { not: null },
    longitude: { not: null },
  }

  const emergencies = scope === false ? [] : await prisma.emergency.findMany({
    where: {
      ...geoBase,
      status: { notIn: ['CERRADA', 'DESCARTADA'] },
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const allCount = scope === false ? 0 : await prisma.emergency.count({ where: geoBase })

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

        {scope === false && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            Este usuario no tiene municipalidad asignada. Contacte a un administrador.
          </div>
        )}

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
            {allCount > emergencies.length && (
              <> ({allCount - emergencies.length} emergencias cerradas no mostradas)</>
            )}
          </span>
        </div>
      </div>
    </MainLayout>
  )
}
