import mongoose, { Schema, Document, Types } from 'mongoose';
import { BATCH_STATUS, SHIFT, BatchStatus, Shift } from '@/types/costTracker';
import type { BatchFlags, BatchCosts, BatchSnapshot } from '@/types/costTracker';

export interface IProductionBatch extends Document {
  batchCode: string;
  productId: Types.ObjectId;
  productionDate: Date;
  shift?: Shift;
  status: BatchStatus;
  plannedInputQty?: number;
  flags: BatchFlags;
  costs: BatchCosts;
  snapshot?: BatchSnapshot & { previous?: BatchSnapshot[] };
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  reopenReason?: string;
  notes?: string;
  createdBy?: Types.ObjectId;
}

const defaultFlags: BatchFlags = {
  hasMaterialConsumed: false,
  hasLabourRecorded: false,
  hasMachineRecorded: false,
  hasConsumablesRecorded: false,
  hasYieldRecorded: false,
  hasPackagingRecorded: false,
  hasOverheadAllocated: false,
};

const defaultCosts: BatchCosts = {
  materialCost: 0,
  labourCost: 0,
  electricityCost: 0,
  consumablesCost: 0,
  packagingCost: 0,
  overheadCost: 0,
  byProductCredit: 0,
  grossManufacturingCost: 0,
  manufacturingCost: 0,
  manufacturingCostPerUnit: null,
  outputUnits: 0,
  isProvisional: false,
  lastComputedAt: null,
};

const ProductionBatchSchema = new Schema<IProductionBatch>({
  batchCode: { type: String, required: true, unique: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productionDate: { type: Date, required: true, index: true },
  shift: { type: String, enum: SHIFT },
  status: { type: String, enum: BATCH_STATUS, required: true, default: 'DRAFT' },
  plannedInputQty: { type: Number, min: 0 },
  flags: { type: Schema.Types.Mixed, required: true, default: () => ({ ...defaultFlags }) },
  costs: { type: Schema.Types.Mixed, required: true, default: () => ({ ...defaultCosts }) },
  snapshot: { type: Schema.Types.Mixed },
  completedAt: { type: Date },
  completedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reopenReason: { type: String, trim: true },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_production_batches' });

export default mongoose.models.ProductionBatch || mongoose.model<IProductionBatch>('ProductionBatch', ProductionBatchSchema);
