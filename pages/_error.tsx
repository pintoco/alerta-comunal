function Error({ statusCode }: { statusCode?: number }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', color: '#e5e7eb', margin: '0 0 1rem' }}>{statusCode ?? '—'}</h1>
        <p style={{ color: '#6b7280' }}>
          {statusCode === 404 ? 'Página no encontrada' : 'Error interno del servidor'}
        </p>
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }: { res?: { statusCode: number }; err?: { statusCode: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500
  return { statusCode }
}

export default Error
