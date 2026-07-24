import mongoose, { Schema, Document, Types } from 'mongoose';
import { UOM, Uom } from '@/types/costTracker';

export interface IConsumableEntry extends Document {
  batchId: Types.ObjectId;
  itemName: string;
  quantity: number;
  uom: Uom;
  ratePerUnit: number;
  lineCost: number;
}

const ConsumableEntrySchema = new Schema<IConsumableEntry>({
  batchId: { type: Schema.Types.ObjectId, ref: 'ProductionBatch', required: true, index: true },
  itemName: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  uom: { type: String, enum: UOM, required: true },
  ratePerUnit: { type: Number, required: true, min: 0 },
  lineCost: { type: Number, required: true },
}, { timestamps: true, collection: 'ct_consumables' });

export default mongoose.models.ConsumableEntry || mongoose.model<IConsumableEntry>('ConsumableEntry', ConsumableEntrySchema);
