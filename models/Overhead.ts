import mongoose, { Schema, Document } from 'mongoose';

export interface IOverheadCategory {
  name: string;
  amount: number;
}

export interface IOverhead extends Document {
  month: number;
  year: number;
  categories: IOverheadCategory[];
  totalOverhead: number;
  totalProductionQty: number;
  overheadRatePerUnit: number;
  isLocked: boolean;
}

const OverheadCategorySchema = new Schema<IOverheadCategory>({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
}, { _id: false });

const OverheadSchema = new Schema<IOverhead>({
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  categories: { type: [OverheadCategorySchema], required: true },
  totalOverhead: { type: Number, required: true },
  totalProductionQty: { type: Number, required: true, min: 0.000001 },
  overheadRatePerUnit: { type: Number, required: true },
  isLocked: { type: Boolean, required: true, default: false },
}, { timestamps: true, collection: 'ct_overheads' });

OverheadSchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.models.Overhead || mongoose.model<IOverhead>('Overhead', OverheadSchema);
