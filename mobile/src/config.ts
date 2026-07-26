// EXPO_PUBLIC_* se inlinea en el bundle en build time — no es secreto, es la
// URL pública de la API (misma app web). Fallback a producción si no se
// definió .env local.
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://alertacomunal.elementalpro.cl'

// Evidence.url puede ser una ruta relativa (/uploads/xxx, storage local) o ya
// absoluta (S3, producción) — src/lib/storage/index.ts decide según el
// STORAGE_PROVIDER activo. La app no comparte origen con la API, así que las
// rutas relativas necesitan el prefijo explícito.
export function resolveMediaUrl(url: string): string {
  return url.startsWith('http') ? url : `${API_URL}${url}`
}
