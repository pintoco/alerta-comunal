'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'

interface Template {
  id?: string
  type: 'ASSIGNMENT' | 'NEW_REPORT'
  subject: string
  body: string
  enabled: boolean
}

const TYPE_LABEL: Record<string, string> = {
  ASSIGNMENT: 'Correo de asignación',
  NEW_REPORT: 'Correo de nuevo reporte ciudadano',
}

const TEMPLATE_VARS: Record<string, string[]> = {
  ASSIGNMENT: [
    '{{code}}', '{{type}}', '{{priority}}', '{{status}}',
    '{{region}}', '{{commune}}', '{{address}}', '{{sector}}',
    '{{description}}', '{{assignedByName}}', '{{link}}',
  ],
  NEW_REPORT: [
    '{{code}}', '{{type}}', '{{priority}}', '{{status}}',
    '{{region}}', '{{commune}}', '{{address}}', '{{sector}}',
    '{{reporterName}}', '{{reporterPhone}}', '{{description}}',
    '{{createdAt}}', '{{municipalityName}}', '{{link}}',
  ],
}

const DEFAULT_TEMPLATES: Record<string, Omit<Template, 'id'>> = {
  ASSIGNMENT: {
    type: 'ASSIGNMENT',
    subject: 'Emergencia asignada — {{code}}',
    body: '<p>Hola,</p><p>Se te ha asignado la emergencia <strong>{{code}}</strong> por {{assignedByName}}.</p><p>Tipo: {{type}} | Prioridad: {{priority}}<br>Dirección: {{address}}</p><p>Descripción: {{description}}</p><p><a href="{{link}}">Ver emergencia →</a></p>',
    enabled: true,
  },
  NEW_REPORT: {
    type: 'NEW_REPORT',
    subject: 'Nuevo reporte ciudadano — {{code}}',
    body: '<p>Se ha recibido un nuevo reporte ciudadano.</p><p>Código: <strong>{{code}}</strong><br>Tipo: {{type}} | Prioridad: {{priority}}<br>Dirección: {{address}}<br>Reportante: {{reporterName}} ({{reporterPhone}})</p><p>Descripción: {{description}}</p><p><a href="{{link}}">Ver emergencia →</a></p>',
    enabled: true,
  },
}

export default function TemplatesPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()
  const [templates, setTemplates] = useState<Record<string, Template>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState<'ASSIGNMENT' | 'NEW_REPORT'>('ASSIGNMENT')

  useEffect(() => {
    fetch(`/api/admin/municipalidades/${id}/templates`)
      .then((r) => r.json())
      .then((data: Template[]) => {
        const map: Record<string, Template> = {}
        for (const tpl of data) map[tpl.type] = tpl
        setTemplates(map)
      })
      .catch(() => setError('Error al cargar los templates'))
      .finally(() => setLoading(false))
  }, [id])

  const current: Template = templates[activeTab] ?? { ...DEFAULT_TEMPLATES[activeTab] }

  function updateField(field: keyof Template, value: string | boolean) {
    setTemplates((prev) => ({
      ...prev,
      [activeTab]: { ...(prev[activeTab] ?? DEFAULT_TEMPLATES[activeTab]), [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(activeTab)
    setError('')
    setSuccess('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, subject: current.subject, body: current.body, enabled: current.enabled }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al guardar')
      }
      const saved: Template = await res.json()
      setTemplates((prev) => ({ ...prev, [activeTab]: saved }))
      setSuccess('Template guardado correctamente.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-blue-600">Administración</Link>
          <span>›</span>
          <Link href="/admin/municipalidades" className="hover:text-blue-600">Municipalidades</Link>
          <span>›</span>
          <Link href={`/admin/municipalidades/${id}`} className="hover:text-blue-600">Detalle</Link>
          <span>›</span>
          <span>Templates de correo</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Templates de correo</h1>
          <p className="text-sm text-gray-500 mt-1">
            Personaliza los correos automáticos enviados por esta municipalidad. Usa <code className="bg-gray-100 px-1 rounded text-xs">{`{{variable}}`}</code> para insertar datos dinámicos.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {(['ASSIGNMENT', 'NEW_REPORT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setActiveTab(type); setSuccess('') }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === type
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TYPE_LABEL[type]}
              {templates[type] && (
                <span className={`ml-2 inline-block w-2 h-2 rounded-full ${templates[type].enabled ? 'bg-green-400' : 'bg-gray-300'}`} />
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <div className="card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">{TYPE_LABEL[activeTab]}</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={current.enabled}
                  onChange={(e) => updateField('enabled', e.target.checked)}
                />
                Activar template personalizado
              </label>
            </div>

            <div>
              <label className="form-label">Asunto</label>
              <input
                className="form-input"
                value={current.subject}
                onChange={(e) => updateField('subject', e.target.value)}
                placeholder="Ej: Emergencia asignada — {{code}}"
              />
            </div>

            <div>
              <label className="form-label">Cuerpo del correo (HTML)</label>
              <textarea
                className="form-input font-mono text-xs"
                rows={14}
                value={current.body}
                onChange={(e) => updateField('body', e.target.value)}
                placeholder="<p>Contenido del correo...</p>"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Variables disponibles</p>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_VARS[activeTab].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 hover:bg-blue-100 font-mono"
                    onClick={() => {
                      const el = document.querySelector('textarea') as HTMLTextAreaElement | null
                      if (el) {
                        const start = el.selectionStart
                        const end = el.selectionEnd
                        const newVal = current.body.slice(0, start) + v + current.body.slice(end)
                        updateField('body', newVal)
                        setTimeout(() => {
                          el.focus()
                          el.setSelectionRange(start + v.length, start + v.length)
                        }, 0)
                      } else {
                        updateField('body', current.body + v)
                      }
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Volver
              </Button>
              <Button
                type="button"
                loading={saving === activeTab}
                onClick={handleSave}
              >
                Guardar template
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
