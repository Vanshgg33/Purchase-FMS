import mongoose, { Schema, Document, Types } from 'mongoose';

// The one sanctioned exception to "never store computed values" — a dated historical record.
export interface ICostSnapshot extends Document {
  productId: Types.ObjectId;
  date: Date;
  batchTotal: number;
  costPerUnit: number;
  sellingPrice: number;
  marginPct: number;
}

const CostSnapshotSchema = new Schema<ICostSnapshot>({
  productId: { type: Schema.Types.ObjectId, ref: 'CostProduct', required: true },
  date: { type: Date, default: Date.now },
  batchTotal: { type: Number, required: true },
  costPerUnit: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  marginPct: { type: Number, required: true },
});

CostSnapshotSchema.index({ productId: 1, date: 1 });

export default mongoose.models.CostSnapshot || mongoose.model<ICostSnapshot>('CostSnapshot', CostSnapshotSchema);
