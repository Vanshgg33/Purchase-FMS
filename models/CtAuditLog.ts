import mongoose, { Schema, Document, Types } from 'mongoose';
import { AUDIT_ACTION, AuditAction } from '@/types/costTracker';

export interface ICtAuditLog extends Document {
  entity: string;
  entityId: Types.ObjectId;
  action: AuditAction;
  userId: Types.ObjectId;
  userName: string;
  changes?: Record<string, { before: unknown; after: unknown }>;
  reason?: string;
  ipAddress?: string;
  at: Date;
}

const CtAuditLogSchema = new Schema<ICtAuditLog>({
  entity: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true, index: true },
  action: { type: String, enum: AUDIT_ACTION, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  changes: { type: Schema.Types.Mixed },
  reason: { type: String },
  ipAddress: { type: String },
  at: { type: Date, required: true, default: Date.now },
}, { collection: 'ct_audit_logs' });

CtAuditLogSchema.index({ at: -1 });

export default mongoose.models.CtAuditLog || mongoose.model<ICtAuditLog>('CtAuditLog', CtAuditLogSchema);
