import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar userRole={session.role} userName={session.name} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  )
}
