import mongoose, { Schema, Document } from 'mongoose';

export interface IRawMaterial extends Document {
  name: string;
  unit: string;
  category: string;
  minStockAlert?: number;
  isActive: boolean;
  addedBy: string;
  createdAt: Date;
}

const RawMaterialSchema = new Schema<IRawMaterial>({
  name: { type: String, required: true, unique: true },
  unit: { type: String, default: 'KG' },
  category: { type: String, default: '' },
  minStockAlert: Number,
  isActive: { type: Boolean, default: true },
  addedBy: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.models.RawMaterial || mongoose.model<IRawMaterial>('RawMaterial', RawMaterialSchema);
