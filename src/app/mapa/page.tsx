import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import MainLayout from '@/components/layout/MainLayout'
import MapWrapper from '@/components/map/MapWrapper'
import type { Emergency } from '@/types'
import { getEmergencyScope } from '@/lib/tenant'

const REGION_CENTERS: Record<string, [number, number]> = {
  'Arica y Parinacota': [-18.47, -70.33],
  'Tarapacá': [-20.21, -70.15],
  'Antofagasta': [-23.65, -70.40],
  'Atacama': [-27.37, -70.33],
  'Coquimbo': [-30.00, -71.00],
  'Valparaíso': [-33.03, -71.65],
  'Metropolitana': [-33.46, -70.65],
  'Metropolitana de Santiago': [-33.46, -70.65],
  "O'Higgins": [-34.58, -71.00],
  'Libertador General Bernardo O\'Higgins': [-34.58, -71.00],
  'Maule': [-35.43, -71.67],
  'Ñuble': [-36.73, -72.10],
  'Biobío': [-37.47, -72.35],
  'Bío-Bío': [-37.47, -72.35],
  'La Araucanía': [-38.95, -72.67],
  'Los Ríos': [-39.83, -73.23],
  'Los Lagos': [-41.47, -72.93],
  'Aysén': [-46.00, -74.00],
  'Aysén del General Carlos Ibáñez del Campo': [-46.00, -74.00],
  'Magallanes': [-53.16, -70.91],
  'Magallanes y de la Antártica Chilena': [-53.16, -70.91],
}

const CHILE_DEFAULT: [number, number] = [-35.68, -71.54]

export default async function MapaPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const scope = getEmergencyScope(session)

  const geoBase: Record<string, unknown> = {
    ...(scope !== false ? scope : {}),
    latitude: { not: null },
    longitude: { not: null },
  }

  const [emergencies, allCount] = await Promise.all([
    scope === false ? Promise.resolve([]) : prisma.emergency.findMany({
      where: {
        ...geoBase,
        status: { notIn: ['CERRADA', 'DESCARTADA'] },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    scope === false ? Promise.resolve(0) : prisma.emergency.count({ where: geoBase }),
  ])

  // Determine map center: use emergencies centroid if available, otherwise municipality region
  let defaultCenter: [number, number] = CHILE_DEFAULT
  let defaultZoom = session.role === 'SUPER_ADMIN' ? 6 : 11

  if (session.role !== 'SUPER_ADMIN' && session.municipalityId) {
    const muni = await prisma.municipality.findUnique({
      where: { id: session.municipalityId },
      select: { region: true },
    })
    if (muni?.region) {
      const rc = REGION_CENTERS[muni.region]
      if (rc) defaultCenter = rc
    }
  }

  if (emergencies.length > 0) {
    const avgLat = emergencies.reduce((s, e) => s + (e.latitude ?? 0), 0) / emergencies.length
    const avgLng = emergencies.reduce((s, e) => s + (e.longitude ?? 0), 0) / emergencies.length
    defaultCenter = [avgLat, avgLng]
    defaultZoom = 13
  }

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
          center={defaultCenter}
          zoom={defaultZoom}
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
