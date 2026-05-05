'use client'

import { useRouter } from 'next/navigation'
import type { Session } from '@/types'

export default function Header({ session }: { session: Session | null }) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between no-print">
      <div />
      <div className="flex items-center gap-4">
        {session && (
          <span className="text-sm text-gray-600">
            Bienvenido, <span className="font-medium text-gray-900">{session.name}</span>
          </span>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </header>
  )
}
