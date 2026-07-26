import { prisma } from './prisma'

export interface MunicipalityUsage {
  emergenciesThisMonth: number
  activeUsers: number
  storageBytes: number
}

/** Sin infraestructura de cron en el proyecto: el uso mensual se calcula al
 * vuelo filtrando por el mes actual, en vez de un contador acumulado que
 * necesitaría resetearse. */
export async function getMunicipalityUsage(municipalityId: string): Promise<MunicipalityUsage> {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [emergenciesThisMonth, activeUsers, storageAgg] = await Promise.all([
    prisma.emergency.count({ where: { municipalityId, createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { municipalityId, active: true } }),
    prisma.evidence.aggregate({ where: { emergency: { municipalityId } }, _sum: { size: true } }),
  ])

  return {
    emergenciesThisMonth,
    activeUsers,
    storageBytes: storageAgg._sum.size ?? 0,
  }
}
