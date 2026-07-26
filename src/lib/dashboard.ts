import { prisma } from '@/lib/prisma'
import { getEmergencyScope } from '@/lib/tenant'
import type { Session } from '@/types'

export interface DashboardData {
  total: number
  nueva: number
  enAtencion: number
  resuelta: number
  cerrada: number
  descartada: number
  critica: number
  last7days: number
  closedLast7days: number
  resolvedPercent: number
  avgClosureDays: number | null
  byCategory: Array<{ label: string; count: number }>
  byPriority: Array<{ priority: string; count: number }>
  recent: Array<{
    id: string
    code: string
    title: string
    status: string
    priority: string
    type: string | null
    category: { id: string; label: string } | null
    address: string
    createdAt: Date
    assignedTo: { id: string; name: string; email: string; role: string; active: boolean; createdAt: Date; updatedAt: Date } | null
  }>
  noMunicipality: boolean
}

export async function getDashboardData(session: Session): Promise<DashboardData> {
  const scope = getEmergencyScope(session)
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  if (scope === false) {
    return {
      total: 0, nueva: 0, enAtencion: 0, resuelta: 0, cerrada: 0, descartada: 0,
      critica: 0, last7days: 0, closedLast7days: 0, resolvedPercent: 0,
      avgClosureDays: null,
      byCategory: [],
      byPriority: [],
      recent: [],
      noMunicipality: true,
    }
  }

  const [
    total, nueva, enAtencion, resuelta, cerrada, descartada, critica,
    last7days, closedLast7days, byTypeRaw, byPriorityRaw, closedWithDates, recent,
  ] = await Promise.all([
    prisma.emergency.count({ where: scope }),
    prisma.emergency.count({ where: { ...scope, status: 'NUEVA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'EN_ATENCION' } }),
    prisma.emergency.count({ where: { ...scope, status: 'RESUELTA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'CERRADA' } }),
    prisma.emergency.count({ where: { ...scope, status: 'DESCARTADA' } }),
    prisma.emergency.count({
      where: { ...scope, priority: 'CRITICA', status: { notIn: ['CERRADA', 'DESCARTADA'] } },
    }),
    prisma.emergency.count({ where: { ...scope, createdAt: { gte: sevenDaysAgo } } }),
    prisma.emergency.count({
      where: { ...scope, closedAt: { gte: sevenDaysAgo, not: null } },
    }),
    prisma.emergency.groupBy({
      by: ['categoryId'],
      where: scope,
      _count: { _all: true },
    }),
    prisma.emergency.groupBy({
      by: ['priority'],
      where: scope,
      _count: { _all: true },
    }),
    prisma.emergency.findMany({
      where: { ...scope, closedAt: { gte: ninetyDaysAgo } },
      select: { createdAt: true, closedAt: true },
      take: 500,
      orderBy: { closedAt: 'desc' },
    }),
    prisma.emergency.findMany({
      where: scope,
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, updatedAt: true },
        },
        category: { select: { id: true, label: true } },
      },
    }),
  ])

  // groupBy no permite incluir la relación — se busca el label de cada
  // categoryId aparte. Dos municipalidades distintas pueden tener una
  // categoría con el mismo label ("Incendio"): se fusionan en una sola
  // entrada por texto (no-op cuando el scope ya es una sola municipalidad).
  const categoryIds = byTypeRaw
    .map((r) => r.categoryId)
    .filter((id): id is string => !!id)
  const categoryRows = categoryIds.length
    ? await prisma.emergencyCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, label: true },
      })
    : []
  const labelById = new Map(categoryRows.map((c) => [c.id, c.label]))
  const countByLabel = new Map<string, number>()
  for (const r of byTypeRaw) {
    const label = r.categoryId ? (labelById.get(r.categoryId) ?? 'Sin categoría') : 'Sin categoría'
    countByLabel.set(label, (countByLabel.get(label) ?? 0) + r._count._all)
  }
  const byCategory = Array.from(countByLabel, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count
  )

  const resolvedPercent = total > 0 ? Math.round(((resuelta + cerrada) / total) * 100) : 0

  let avgClosureDays: number | null = null
  if (closedWithDates.length > 0) {
    const totalMs = closedWithDates.reduce((acc, e) => {
      if (!e.closedAt) return acc
      return acc + (e.closedAt.getTime() - e.createdAt.getTime())
    }, 0)
    avgClosureDays = Math.round((totalMs / closedWithDates.length / (1000 * 60 * 60 * 24)) * 10) / 10
  }

  return {
    total, nueva, enAtencion, resuelta, cerrada, descartada, critica,
    last7days, closedLast7days, resolvedPercent, avgClosureDays,
    byCategory,
    byPriority: byPriorityRaw.map((r) => ({ priority: r.priority, count: r._count._all })),
    recent,
    noMunicipality: false,
  }
}
