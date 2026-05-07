import { storageConfig } from '../config'
import * as local from './local'
import * as s3 from './s3'

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
  originalName: string,
  mimeType?: string
): Promise<{ filename: string; url: string }> {
  const rawExt = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const ext = ALLOWED_EXTENSIONS.includes(rawExt) ? rawExt : 'jpg'

  if (storageConfig.provider === 's3') {
    const filename = await s3.saveFile(buffer, ext, mimeType)
    return { filename, url: s3.getPublicUrl(filename) }
  }

  const filename = await local.saveFile(buffer, ext)
  return { filename, url: local.getPublicUrl(filename) }
}

/**
 * Elimina un archivo del storage.
 * Si se pasa url, determina el proveedor por ella (http → S3, /uploads/ → local).
 * Sin url, usa STORAGE_PROVIDER del entorno.
 */
export async function deleteUpload(filename: string, url?: string): Promise<void> {
  const isS3 = url ? url.startsWith('http') : storageConfig.provider === 's3'
  if (isS3) return s3.deleteFile(filename)
  return local.deleteFile(filename)
}
