'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface WebhookConfig {
  id?: string
  url: string
  secret?: string
  enabled: boolean
  onEmergencyCreated: boolean
  onNewCitizenReport: boolean
  onAssignment: boolean
}

const DEFAULT_CONFIG: WebhookConfig = {
  url: '',
  enabled: true,
  onEmergencyCreated: true,
  onNewCitizenReport: true,
  onAssignment: true,
}

export default function WebhookPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [config, setConfig] = useState<WebhookConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [regenerateSecret, setRegenerateSecret] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetch(`/api/admin/municipalidades/${id}/webhook`)
      .then((r) => r.json())
      .then((data: WebhookConfig | null) => {
        if (data) setConfig(data)
      })
      .catch(() => setError('Error al cargar la configuración del webhook'))
      .finally(() => setLoading(false))
  }, [id])

  function updateField<K extends keyof WebhookConfig>(field: K, value: WebhookConfig[K]) {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/webhook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          enabled: config.enabled,
          onEmergencyCreated: config.onEmergencyCreated,
          onNewCitizenReport: config.onNewCitizenReport,
          onAssignment: config.onAssignment,
          regenerateSecret,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }
      const saved: WebhookConfig = await res.json()
      setConfig(saved)
      setRegenerateSecret(false)
      setSuccess('Webhook guardado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/webhook/test`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo enviar el webhook de prueba')
      setSuccess('Webhook de prueba enviado correctamente — revisa tu endpoint receptor.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el webhook de prueba')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-blue-600">Administración</Link>
          <span>›</span>
          <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
          <span>›</span>
          <Link href={`/admin/municipalidades/${id}`} className="hover:text-blue-600">Detalle</Link>
          <span>›</span>
          <span>Webhook</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webhook</h1>
          <p className="text-sm text-gray-500 mt-1">
            Notifica automáticamente a un sistema externo (mesa de ayuda, Slack, ERP municipal) cuando ocurren eventos en esta municipalidad.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Configuración</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={config.enabled}
                  onChange={(e) => updateField('enabled', e.target.checked)}
                />
                Webhook activo
              </label>
            </div>

            <div>
              <label className="form-label">URL del endpoint (https)</label>
              <input
                className="form-input font-mono text-sm"
                value={config.url}
                onChange={(e) => updateField('url', e.target.value)}
                placeholder="https://tu-sistema.municipio.cl/webhooks/alertacomunal"
              />
              <p className="text-xs text-gray-400 mt-1">Debe ser https:// y no puede apuntar a un host privado o local.</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Eventos que dispararán el webhook</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={config.onEmergencyCreated}
                    onChange={(e) => updateField('onEmergencyCreated', e.target.checked)}
                  />
                  Emergencia creada
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={config.onNewCitizenReport}
                    onChange={(e) => updateField('onNewCitizenReport', e.target.checked)}
                  />
                  Nuevo reporte ciudadano
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={config.onAssignment}
                    onChange={(e) => updateField('onAssignment', e.target.checked)}
                  />
                  Asignación de responsable
                </label>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <label className="form-label">Secreto de firma (HMAC-SHA256)</label>
              {config.secret ? (
                <input className="form-input font-mono text-xs" value={config.secret} readOnly />
              ) : (
                <p className="text-xs text-gray-400">Se generará automáticamente al guardar por primera vez.</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Cada envío incluye el header <code className="bg-gray-100 px-1 rounded">X-AlertaComunal-Signature: sha256=&lt;hmac&gt;</code> calculado
                sobre el cuerpo JSON crudo con este secreto — verifícalo en tu endpoint antes de confiar en el payload.
              </p>
              {config.secret && (
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={regenerateSecret}
                    onChange={(e) => setRegenerateSecret(e.target.checked)}
                  />
                  Regenerar secreto al guardar (invalida el anterior)
                </label>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Volver
              </Button>
              <div className="flex items-center gap-3">
                {config.id && (
                  <Button variant="secondary" type="button" loading={testing} onClick={handleTest}>
                    Enviar prueba
                  </Button>
                )}
                <Button type="button" loading={saving} onClick={handleSave}>
                  Guardar webhook
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
