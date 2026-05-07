import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'

const REQUIRED_VARS = [
  'S3_ENDPOINT',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_PUBLIC_URL',
] as const

const CONFIG_ERROR =
  'Storage S3/MinIO no configurado correctamente. Revisa S3_ENDPOINT, S3_BUCKET, ' +
  'S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY y S3_PUBLIC_URL.'

function validateConfig(): void {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v])
  if (missing.length > 0) throw new Error(CONFIG_ERROR)
}

function createClient(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
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
