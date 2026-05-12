import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import DashboardClient from '@/components/dashboard/DashboardClient'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const initialData = await getDashboardData(session)

  return (
    <MainLayout>
      <DashboardClient
        initialData={initialData}
        canCreate={session.role !== 'VISUALIZADOR'}
      />
    </MainLayout>
  )
}
