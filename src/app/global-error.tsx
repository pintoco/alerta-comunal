'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f9fafb' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#e5e7eb', margin: '0 0 1rem' }}>500</h1>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', margin: '0 0 0.5rem' }}>Error interno del servidor</h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>Ocurrió un error inesperado. Por favor intente nuevamente.</p>
            <button
              onClick={() => reset()}
              style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
