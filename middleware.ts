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
  '/api/auth/login',
  '/api/reporte-publico',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (publicPaths.some((path) => pathname.startsWith(path))) {
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

  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, getSecret())
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('auth-token')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
