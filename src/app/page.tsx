import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import QuickLogin from '@/components/demo/QuickLogin'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Navbar */}
      <header className="px-6 py-4 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg">AlertaComunal</span>
        </div>
        <Link
          href="/login"
          className="text-sm text-blue-300 hover:text-white border border-blue-700 hover:border-blue-400 px-4 py-1.5 rounded-lg transition-colors"
        >
          Iniciar sesión
        </Link>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">
        <div className="mb-6 inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-medium px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
          Sistema municipal de gestión de emergencias
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Gestión de emergencias
          <span className="block text-blue-400 mt-1">comunales en tiempo real</span>
        </h1>

        <p className="text-slate-300 text-lg mb-10 max-w-2xl leading-relaxed">
          Plataforma SaaS para municipios. Registra, georreferencia y hace seguimiento de emergencias
          comunales con reportes imprimibles, evidencias fotográficas y participación ciudadana.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/login"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Iniciar sesión municipal
          </Link>
          <Link
            href="/reportar"
            className="px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Reportar emergencia
          </Link>
          <Link
            href="/consulta"
            className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors text-sm"
          >
            Consultar reporte
          </Link>
        </div>

        {/* Demo quick-login — SOLO PARA PRUEBAS */}
        <QuickLogin />

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full text-left mt-12">
          {[
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              title: 'Registro de emergencias',
              desc: 'Crea y gestiona emergencias con código único automático, prioridad, tipo y asignación de responsable.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              ),
              title: 'Mapa comunal',
              desc: 'Visualiza la distribución geográfica de emergencias activas con marcadores por prioridad en tiempo real.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Evidencias fotográficas',
              desc: 'Sube imágenes desde terreno. Almacenamiento local o en MinIO/S3 con validación de tipo y tamaño.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              ),
              title: 'Seguimiento ciudadano',
              desc: 'El ciudadano reporta sin login y consulta el estado de su reporte usando el código único.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              ),
              title: 'Dashboard ejecutivo',
              desc: 'Métricas en tiempo real: emergencias por tipo, prioridad, tiempo promedio de cierre y exportación CSV.',
            },
            {
              icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Reportes imprimibles',
              desc: 'Genera reportes institucionales listos para imprimir o exportar a PDF con firma y timbre.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors"
            >
              <div className="text-blue-400 mb-3">{feature.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{feature.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-6 text-slate-600 text-xs border-t border-white/5">
        AlertaComunal — Sistema Municipal de Gestión de Emergencias
      </footer>
    </div>
  )
}
