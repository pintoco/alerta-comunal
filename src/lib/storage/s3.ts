import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

// S3_ENDPOINT y las credenciales estáticas solo son obligatorias para MinIO.
// En AWS real, sin S3_ACCESS_KEY_ID/SECRET el SDK usa el rol IAM de la instancia
// (default credential provider chain) y sin S3_ENDPOINT apunta al S3 nativo.
const REQUIRED_VARS = ['S3_BUCKET', 'S3_PUBLIC_URL'] as const

const CONFIG_ERROR =
  'Storage S3 no configurado correctamente. Revisa S3_BUCKET y S3_PUBLIC_URL ' +
  '(y, si usas MinIO, también S3_ENDPOINT, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY).'

function validateConfig(): void {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v])
  if (missing.length > 0) throw new Error(CONFIG_ERROR)
}

function createClient(): S3Client {
  const hasStaticCredentials = !!process.env.S3_ACCESS_KEY_ID && !!process.env.S3_SECRET_ACCESS_KEY

  return new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_FORCE_PATH_STYLE === 'true' ? { forcePathStyle: true } : {}),
    ...(hasStaticCredentials
      ? {
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
          },
        }
      : {}),
  })
}

function mimeTypeFromExt(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }
  return map[ext] || 'application/octet-stream'
}

export async function saveFile(
  buffer: Buffer,
  ext: string,
  mimeType?: string
): Promise<string> {
  validateConfig()
  const filename = `${randomUUID()}.${ext}`
  await createClient().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: filename,
      Body: buffer,
      ContentType: mimeType || mimeTypeFromExt(ext),
    })
  )
  return filename
}

export async function deleteFile(filename: string): Promise<void> {
  validateConfig()
  await createClient().send(
    new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: filename,
    })
  )
}

export function getPublicUrl(filename: string): string {
  const base = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '')
  return `${base}/${filename}`
}
