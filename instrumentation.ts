/**
 * Se ejecuta una vez al arrancar el servidor (Next.js 15, sin flags
 * experimentales). Falla rápido si falta configuración crítica en
 * producción, en vez de recién fallar en el primer login/verificación.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getJwtSecret } = await import('./src/lib/config')
    getJwtSecret() // lanza si falta JWT_SECRET en producción
  }
}
