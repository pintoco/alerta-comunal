/**
 * Capa de abstracción de almacenamiento de archivos.
 * Provider actual: local (public/uploads).
 * Para migrar a Cloudflare R2 en el futuro, implementar r2.ts y
 * conmutar según STORAGE_PROVIDER=r2 sin cambiar los llamadores.
 */

import { storageConfig } from '../config'
import * as local from './local'

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

export function getMaxSizeBytes(): number {
  return storageConfig.maxSizeMb * 1024 * 1024
}

/** Valida tipo MIME y tamaño. Retorna mensaje de error o null si es válido. */
export function validateFile(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return 'Tipo de archivo no permitido. Se aceptan: jpg, jpeg, png, webp'
  }
  if (size > getMaxSizeBytes()) {
    return `El archivo supera el tamaño máximo (${storageConfig.maxSizeMb}MB)`
  }
  return null
}

/** Guarda un archivo subido y retorna filename y url pública. */
export async function saveUpload(
  buffer: Buffer,
  originalName: string
): Promise<{ filename: string; url: string }> {
  const rawExt = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'
  const filename = await local.saveFile(buffer, ext)
  return { filename, url: local.getPublicUrl(filename) }
}

/** Elimina un archivo del storage. */
export async function deleteUpload(filename: string): Promise<void> {
  return local.deleteFile(filename)
}
