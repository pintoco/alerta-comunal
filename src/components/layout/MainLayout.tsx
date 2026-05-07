import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Sidebar from './Sidebar'
import Header from './Header'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  let municipalityName: string | null = null
  let municipalityCommune: string | null = null
  if (session.municipalityId) {
    const municipality = await prisma.municipality.findUnique({
      where: { id: session.municipalityId },
      select: { name: true, commune: true, region: true },
    })
    municipalityName = municipality?.name ?? null
    const parts = [municipality?.commune, municipality?.region].filter(Boolean)
    municipalityCommune = parts.length > 0 ? parts.join(', ') : null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar
        userRole={session.role}
        userName={session.name}
        municipalityName={municipalityName}
        municipalityCommune={municipalityCommune}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
