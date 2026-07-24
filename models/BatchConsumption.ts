import mongoose, { Schema, Document, Types } from 'mongoose';
import { UOM, Uom } from '@/types/costTracker';

export interface IBatchConsumption extends Document {
  batchId: Types.ObjectId;
  lotId: Types.ObjectId;
  rawMaterialId: Types.ObjectId;
  quantityConsumed: number;
  uom: Uom;
  landedCostPerUnit: number;
  lineCost: number;
  consumedAt: Date;
  isReversed: boolean;
}

const BatchConsumptionSchema = new Schema<IBatchConsumption>({
  batchId: { type: Schema.Types.ObjectId, ref: 'ProductionBatch', required: true, index: true },
  lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot', required: true },
  rawMaterialId: { type: Schema.Types.ObjectId, ref: 'CtRawMaterial', required: true },
  quantityConsumed: { type: Number, required: true, min: 0.000001 },
  uom: { type: String, enum: UOM, required: true },
  landedCostPerUnit: { type: Number, required: true },
  lineCost: { type: Number, required: true },
  consumedAt: { type: Date, required: true, default: Date.now },
  isReversed: { type: Boolean, required: true, default: false },
}, { timestamps: true, collection: 'ct_batch_consumption' });

export default mongoose.models.BatchConsumption || mongoose.model<IBatchConsumption>('BatchConsumption', BatchConsumptionSchema);
