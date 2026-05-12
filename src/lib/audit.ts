import { prisma } from './prisma'

interface AuditEntry {
  action: string
  entityType?: string
  entityId?: string
  entityLabel?: string
  userId?: string
  userName?: string
  ipAddress?: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({ data: entry as any })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
