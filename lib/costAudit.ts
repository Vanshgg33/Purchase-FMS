import CtAuditLog from '@/models/CtAuditLog';
import type { AuditAction } from '@/types/costTracker';
import type { CtSession } from '@/lib/permissions';

export async function writeAudit(opts: {
  entity: string;
  entityId: string;
  action: AuditAction;
  session: CtSession;
  changes?: Record<string, { before: unknown; after: unknown }>;
  reason?: string;
  ipAddress?: string;
}) {
  await CtAuditLog.create({
    entity: opts.entity,
    entityId: opts.entityId,
    action: opts.action,
    userId: opts.session.userId,
    userName: opts.session.name,
    changes: opts.changes,
    reason: opts.reason,
    ipAddress: opts.ipAddress,
    at: new Date(),
  });
}
