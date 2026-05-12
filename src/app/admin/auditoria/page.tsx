import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const dynamic = 'force-dynamic'

const ACTION_BADGE: Record<string, string> = {
  EMERGENCY_DELETED: 'bg-red-100 text-red-700',
  LOGIN_FAILED:      'bg-yellow-100 text-yellow-700',
  RATE_LIMIT_HIT:    'bg-orange-100 text-orange-700',
  EMAIL_SENT:        'bg-green-100 text-green-700',
  EMAIL_FAILED:      'bg-red-100 text-red-700',
}

const ACTION_LABEL: Record<string, string> = {
  EMERGENCY_DELETED: 'Emergencia eliminada',
  LOGIN_FAILED:      'Login fallido',
  RATE_LIMIT_HIT:    'Límite de intentos',
  EMAIL_SENT:        'Correo enviado',
  EMAIL_FAILED:      'Correo fallido',
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>
}) {
  const session = await getSession()
  if (!session || session.role !== 'SUPER_ADMIN') redirect('/dashboard')

  const { page: pageParam, action: actionParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam || '1'))
  const action = actionParam || ''
  const limit = 50
  const skip = (page - 1) * limit
  const where = action ? { action } : {}

  const [logs, total, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    }),
  ])

  const pages = Math.ceil(total / limit)

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link href="/admin" className="hover:text-blue-600">Administración</Link>
              <span>›</span>
              <span>Auditoría</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Auditoría del sistema</h1>
            <p className="text-gray-500 text-sm mt-1">{total} eventos registrados</p>
          </div>
        </div>

        <form method="GET" className="flex items-center gap-3 flex-wrap">
          <label className="text-sm text-gray-600">Filtrar:</label>
          <select
            name="action"
            defaultValue={action}
            className="form-input text-sm py-1.5 w-auto"
          >
            <option value="">Todos los eventos</option>
            {distinctActions.map((a) => (
              <option key={a.action} value={a.action}>
                {ACTION_LABEL[a.action] ?? a.action}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary text-sm px-3 py-1.5">Filtrar</button>
          {action && (
            <Link href="/admin/auditoria" className="text-sm text-gray-500 hover:underline">
              Limpiar
            </Link>
          )}
        </form>

        <div className="card overflow-hidden">
          {logs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No hay eventos de auditoría registrados aún.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Evento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss', { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_BADGE[log.action] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ACTION_LABEL[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.entityLabel ? (
                        <span className="font-mono text-xs text-gray-800">{log.entityLabel}</span>
                      ) : log.entityType ? (
                        <span className="text-xs text-gray-400 italic">{log.entityType}</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {log.userName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-400">
                      {log.ipAddress ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-500">
              Página {page} de {pages} · {total} eventos
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/auditoria?page=${page - 1}${action ? `&action=${action}` : ''}`}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  ← Anterior
                </Link>
              )}
              {page < pages && (
                <Link
                  href={`/admin/auditoria?page=${page + 1}${action ? `&action=${action}` : ''}`}
                  className="btn-secondary text-xs px-3 py-1.5"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
