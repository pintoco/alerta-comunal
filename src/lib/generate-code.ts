import { prisma } from './prisma'

export async function generateEmergencyCode(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.emergency.count({
    where: { code: { startsWith: `EMG-${year}-` } },
  })
  return `EMG-${year}-${String(count + 1).padStart(4, '0')}`
}
