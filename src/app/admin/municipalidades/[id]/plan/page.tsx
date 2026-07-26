'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Alert from '@/components/ui/Alert'
import { PLAN_ORDER, PLAN_LIMITS, type SubscriptionPlanId, type PlanLimits } from '@/lib/plans'

interface PlanUsage {
  emergenciesThisMonth: number
  activeUsers: number
  storageBytes: number
}

interface PlanData {
  plan: SubscriptionPlanId
  limits: PlanLimits
  usage: PlanUsage
  canEdit: boolean
}

const PLAN_BADGE: Record<SubscriptionPlanId, string> = {
  GRATUITO: 'bg-gray-100 text-gray-600',
  BASICO: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
}

function UsageBar({ label, used, max, format }: { label: string; used: number; max: number | null; format?: (n: number) => string }) {
  const fmt = format ?? ((n: number) => String(n))
  const pct = max ? Math.min(100, Math.round((used / max) * 100)) : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">
          {fmt(used)} {max !== null ? `/ ${fmt(max)}` : <span className="text-green-600 font-medium">Sin límite</span>}
        </span>
      </div>
      {max !== null && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  )
}

export default function PlanPage() {
  const params = useParams() ?? {}
  const id = params.id as string
  const router = useRouter()

  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/admin/municipalidades/${id}/plan`)
      .then((r) => r.json())
      .then((d: PlanData) => setData(d))
      .catch(() => setError('Error al cargar el plan'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleChangePlan(newPlan: SubscriptionPlanId) {
    if (!data) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/municipalidades/${id}/plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || 'Error al cambiar el plan')
      }
      setData({ ...data, plan: newPlan, limits: PLAN_LIMITS[newPlan] })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cambiar el plan')
    } finally {
      setSaving(false)
    }
  }

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
          <span>Plan y uso</span>
        </nav>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan y uso</h1>
          <p className="text-sm text-gray-500 mt-1">
            Límites de referencia informativos por plan — no bloquean la creación de
            emergencias ni usuarios al superarse.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} />}

        {loading || !data ? (
          <div className="card p-8 text-center text-gray-400">Cargando...</div>
        ) : (
          <>
            <div className="card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${PLAN_BADGE[data.plan]}`}>
                  Plan {data.limits.label}
                </span>
                {data.plan === 'GRATUITO' && (
                  <span className="text-xs text-gray-400">
                    Muestra &quot;Powered by Elemental Pro&quot; en las páginas públicas
                  </span>
                )}
              </div>

              {data.canEdit ? (
                <div>
                  <label className="form-label">Cambiar plan</label>
                  <select
                    className="form-input mt-1"
                    value={data.plan}
                    disabled={saving}
                    onChange={(e) => handleChangePlan(e.target.value as SubscriptionPlanId)}
                  >
                    {PLAN_ORDER.map((p) => (
                      <option key={p} value={p}>{PLAN_LIMITS[p].label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  Solo un Super Administrador puede cambiar el plan de tu municipalidad.
                </p>
              )}
            </div>

            <div className="card p-6 space-y-5">
              <h2 className="text-sm font-semibold text-gray-700">Uso este mes</h2>
              <UsageBar
                label="Emergencias creadas"
                used={data.usage.emergenciesThisMonth}
                max={data.limits.maxEmergenciesPerMonth}
              />
              <UsageBar
                label="Usuarios activos"
                used={data.usage.activeUsers}
                max={data.limits.maxActiveUsers}
              />
              <UsageBar
                label="Almacenamiento de evidencias"
                used={Math.round(data.usage.storageBytes / (1024 * 1024))}
                max={data.limits.maxStorageMb}
                format={(n) => `${n} MB`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
