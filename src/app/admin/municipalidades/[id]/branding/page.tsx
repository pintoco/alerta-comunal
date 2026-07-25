'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface Branding {
  logoUrl: string | null
  primaryColor: string | null
}

const DEFAULT_COLOR = '#2563eb'

export default function BrandingPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [branding, setBranding] = useState<Branding>({ logoUrl: null, primaryColor: null })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/admin/municipalidades/${id}/branding`)
      .then((r) => r.json())
      .then((data: Branding) => setBranding(data))
      .catch(() => setError('Error al cargar la configuración de marca'))
      .finally(() => setLoading(false))
  }, [id])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) { setLogoPreview(null); return }
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const formData = new FormData()
      formData.append('primaryColor', branding.primaryColor || DEFAULT_COLOR)
      const file = fileRef.current?.files?.[0]
      if (file) formData.append('logo', file)

      const res = await fetch(`/api/admin/municipalidades/${id}/branding`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }
      const saved: Branding = await res.json()
      setBranding(saved)
      setLogoPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      setSuccess('Marca guardada correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const currentLogo = logoPreview || branding.logoUrl

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-blue-600">Administración</Link>
          <span>›</span>
          <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
          <span>›</span>
          <Link href={`/admin/municipalidades/${id}`} className="hover:text-blue-600">Detalle</Link>
          <span>›</span>
          <span>Marca</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marca de la municipalidad</h1>
          <p className="text-sm text-gray-500 mt-1">
            El logo y el color se muestran en las páginas públicas ciudadanas de esta
            municipalidad (formulario de reportes y mapa público).
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card p-6 space-y-5">
            <div>
              <label className="form-label">Logo</label>
              <div className="flex items-center gap-4 mt-1">
                <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
                  {currentLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={currentLogo} alt="Logo actual" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-gray-300">Sin logo</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Formatos: jpg, png, webp. Máximo 5 MB.</p>
            </div>

            <div>
              <label className="form-label">Color de acento</label>
              <div className="flex items-center gap-3 mt-1">
                <input
                  type="color"
                  value={branding.primaryColor || DEFAULT_COLOR}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  className="form-input font-mono uppercase"
                  value={branding.primaryColor || DEFAULT_COLOR}
                  onChange={(e) => setBranding((prev) => ({ ...prev, primaryColor: e.target.value }))}
                  maxLength={7}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Volver
              </Button>
              <Button type="button" loading={saving} onClick={handleSave}>
                Guardar marca
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
