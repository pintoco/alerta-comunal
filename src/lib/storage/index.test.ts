import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('validateFile', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s under the size limit', async (mimeType) => {
    const { validateFile } = await import('./index')
    expect(validateFile(mimeType, 1024)).toBeNull()
  })

  it.each(['image/svg+xml', 'application/pdf', 'application/x-msdownload', 'text/html', ''])(
    'rejects disallowed MIME type %s',
    async (mimeType) => {
      const { validateFile } = await import('./index')
      expect(validateFile(mimeType, 1024)).toMatch(/no permitido/)
    }
  )

  it('accepts a file exactly at the size limit', async () => {
    const { validateFile, getMaxSizeBytes } = await import('./index')
    expect(validateFile('image/png', getMaxSizeBytes())).toBeNull()
  })

  it('rejects a file one byte over the size limit', async () => {
    const { validateFile, getMaxSizeBytes } = await import('./index')
    expect(validateFile('image/png', getMaxSizeBytes() + 1)).toMatch(/tamaño máximo/)
  })

  it('accepts a zero-byte file (size is not validated as non-empty)', async () => {
    const { validateFile } = await import('./index')
    expect(validateFile('image/jpeg', 0)).toBeNull()
  })

  it('rejects an allowed MIME type that still exceeds the size limit', async () => {
    const { validateFile, getMaxSizeBytes } = await import('./index')
    expect(validateFile('image/jpeg', getMaxSizeBytes() * 2)).toMatch(/tamaño máximo/)
  })
})

describe('saveUpload / deleteUpload provider dispatch', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('dispatches to the local backend by default', async () => {
    vi.doMock('../config', () => ({ storageConfig: { provider: 'local', maxSizeMb: 5 } }))
    const local = { saveFile: vi.fn().mockResolvedValue('file.jpg'), getPublicUrl: vi.fn().mockReturnValue('/uploads/file.jpg'), deleteFile: vi.fn() }
    const s3 = { saveFile: vi.fn(), getPublicUrl: vi.fn(), deleteFile: vi.fn() }
    vi.doMock('./local', () => local)
    vi.doMock('./s3', () => s3)

    const { saveUpload } = await import('./index')
    const result = await saveUpload(Buffer.from('data'), 'photo.jpg', 'image/jpeg')

    expect(local.saveFile).toHaveBeenCalled()
    expect(s3.saveFile).not.toHaveBeenCalled()
    expect(result).toEqual({ filename: 'file.jpg', url: '/uploads/file.jpg' })
  })

  it('dispatches to S3 when STORAGE_PROVIDER=s3', async () => {
    vi.doMock('../config', () => ({ storageConfig: { provider: 's3', maxSizeMb: 5 } }))
    const local = { saveFile: vi.fn(), getPublicUrl: vi.fn(), deleteFile: vi.fn() }
    const s3 = { saveFile: vi.fn().mockResolvedValue('file.jpg'), getPublicUrl: vi.fn().mockReturnValue('https://bucket.s3/file.jpg'), deleteFile: vi.fn() }
    vi.doMock('./local', () => local)
    vi.doMock('./s3', () => s3)

    const { saveUpload } = await import('./index')
    const result = await saveUpload(Buffer.from('data'), 'photo.jpg', 'image/jpeg')

    expect(s3.saveFile).toHaveBeenCalled()
    expect(local.saveFile).not.toHaveBeenCalled()
    expect(result).toEqual({ filename: 'file.jpg', url: 'https://bucket.s3/file.jpg' })
  })

  it('falls back to jpg extension for an unrecognized/missing file extension', async () => {
    vi.doMock('../config', () => ({ storageConfig: { provider: 'local', maxSizeMb: 5 } }))
    const local = { saveFile: vi.fn().mockResolvedValue('file.jpg'), getPublicUrl: vi.fn().mockReturnValue('/uploads/file.jpg'), deleteFile: vi.fn() }
    vi.doMock('./local', () => local)
    vi.doMock('./s3', () => ({ saveFile: vi.fn(), getPublicUrl: vi.fn(), deleteFile: vi.fn() }))

    const { saveUpload } = await import('./index')
    await saveUpload(Buffer.from('data'), 'photo.exe', 'image/jpeg')

    expect(local.saveFile).toHaveBeenCalledWith(expect.anything(), 'jpg')
  })

  it('deleteUpload routes by URL scheme when a url is provided, regardless of STORAGE_PROVIDER', async () => {
    vi.doMock('../config', () => ({ storageConfig: { provider: 'local', maxSizeMb: 5 } }))
    const local = { saveFile: vi.fn(), getPublicUrl: vi.fn(), deleteFile: vi.fn() }
    const s3 = { saveFile: vi.fn(), getPublicUrl: vi.fn(), deleteFile: vi.fn() }
    vi.doMock('./local', () => local)
    vi.doMock('./s3', () => s3)

    const { deleteUpload } = await import('./index')
    await deleteUpload('file.jpg', 'https://bucket.s3.amazonaws.com/file.jpg')

    expect(s3.deleteFile).toHaveBeenCalledWith('file.jpg')
    expect(local.deleteFile).not.toHaveBeenCalled()
  })
})
