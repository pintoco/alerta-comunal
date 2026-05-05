import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-200 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Página no encontrada</h2>
        <p className="text-gray-500 mb-6 text-sm">La página que buscas no existe o fue movida.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Ir al Dashboard
        </Link>
      </div>
    </div>
  )
}
