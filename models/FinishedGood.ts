import mongoose, { Schema, Document, Types } from 'mongoose';
import { OUTPUT_TYPE, UOM, OutputType, Uom } from '@/types/costTracker';

export interface IFinishedGood extends Document {
  batchId: Types.ObjectId;
  outputType: OutputType;
  productId?: Types.ObjectId;
  byProductName?: string;
  quantity: number;
  uom: Uom;
  unitsProduced?: number;
  realisableRatePerUnit?: number;
  realisableValue?: number;
  yieldPercent?: number;
}

const FinishedGoodSchema = new Schema<IFinishedGood>({
  batchId: { type: Schema.Types.ObjectId, ref: 'ProductionBatch', required: true, index: true },
  outputType: { type: String, enum: OUTPUT_TYPE, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  byProductName: { type: String, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  uom: { type: String, enum: UOM, required: true },
  unitsProduced: { type: Number, min: 0 },
  realisableRatePerUnit: { type: Number, min: 0 },
  realisableValue: { type: Number, min: 0 },
  yieldPercent: { type: Number },
}, { timestamps: true, collection: 'ct_finished_goods' });

// Exactly one PRIMARY output row per batch
FinishedGoodSchema.index({ batchId: 1, outputType: 1 }, { unique: true, partialFilterExpression: { outputType: 'PRIMARY' } });

export default mongoose.models.FinishedGood || mongoose.model<IFinishedGood>('FinishedGood', FinishedGoodSchema);
