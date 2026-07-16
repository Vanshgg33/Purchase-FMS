import mongoose, { Schema, Document } from 'mongoose';

export interface ICostProduct extends Document {
  name: string;
  sku?: string;
  unit: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const CostProductSchema = new Schema<ICostProduct>({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  unit: { type: String, default: 'unit' },
  position: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.CostProduct || mongoose.model<ICostProduct>('CostProduct', CostProductSchema);
