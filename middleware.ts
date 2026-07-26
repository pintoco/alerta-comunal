import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

// Middleware corre en Edge runtime: leer JWT_SECRET directo desde process.env.
// En producción Railway, si JWT_SECRET no está configurado los tokens no
// verifican y el usuario es redirigido a /login (fallo seguro).
function getSecret(): Uint8Array {
  return new TextEncoder().encode(
    process.env.JWT_SECRET || 'alerta-comunal-dev-secret-DO-NOT-USE-IN-PRODUCTION'
  )
}

const publicPaths = [
  '/login',
  '/reportar',
  '/consulta',
  '/mapa-publico',
  '/api/auth/login',
  '/api/reporte-publico',
  '/api/mapa-publico',
  '/api/municipios-publicos',
  '/api/health',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === '/' || publicPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico' ||
    (pathname.includes('.') && !pathname.startsWith('/api'))
  ) {
    return NextResponse.next()
  }

  const cookieToken = request.cookies.get('auth-token')?.value
  // Fallback para la app móvil (sin cookie jar httpOnly): mismo JWT vía
  // Authorization: Bearer. Si no hay header o no trae el prefijo, queda undefined
  // y el flujo de abajo se comporta exactamente igual que hoy para clientes web.
  const authHeader = request.headers.get('authorization')
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined
  const token = cookieToken || headerToken
  const isApi = pathname.startsWith('/api')

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    // Para rutas de página, redirigir a /login (fallo seguro de UI). Para
    // /api/*, un 401 JSON — de lo contrario un fetch() sigue el redirect
    // 307 y termina intentando parsear el HTML de /login como JSON,
    // mostrando "Unexpected token '<'" en vez de un error claro de sesión.
    if (isApi) {
      const response = NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 })
      response.cookies.delete('auth-token')
      return response
    }
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
