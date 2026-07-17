import mongoose, { Schema, Document } from 'mongoose';

export interface ICostProduct extends Document {
  name: string;
  sku?: string;
  unit: string;
  batchQty: number; // units produced per batch (1 = per-unit entry)
  sellingPrice: number; // ₹ — edited via the Quick Price pill
  priceLocked: boolean; // pill editable by superadmin only when true
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const CostProductSchema = new Schema<ICostProduct>({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  unit: { type: String, default: 'unit' },
  batchQty: { type: Number, default: 1 },
  sellingPrice: { type: Number, default: 0 },
  priceLocked: { type: Boolean, default: false },
  position: { type: Number, required: true },
}, { timestamps: true });

export default mongoose.models.CostProduct || mongoose.model<ICostProduct>('CostProduct', CostProductSchema);
