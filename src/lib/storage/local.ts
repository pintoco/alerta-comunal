import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export async function saveFile(buffer: Buffer, ext: string): Promise<string> {
  const uploadDir = join(process.cwd(), 'public', 'uploads')
  await mkdir(uploadDir, { recursive: true })
  const filename = `${randomUUID()}.${ext}`
  await writeFile(join(uploadDir, filename), buffer)
  return filename
}

export async function deleteFile(filename: string): Promise<void> {
  try {
    await unlink(join(process.cwd(), 'public', 'uploads', filename))
  } catch {
    // Ignorar si el archivo no existe
  }
}

export function getPublicUrl(filename: string): string {
  return `/uploads/${filename}`
}
