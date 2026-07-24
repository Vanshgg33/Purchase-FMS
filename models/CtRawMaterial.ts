import mongoose, { Schema, Document } from 'mongoose';
import { RM_CATEGORY, UOM, RmCategory, Uom } from '@/types/costTracker';

export interface ICtRawMaterial extends Document {
  code: string;
  name: string;
  category: RmCategory;
  uom: Uom;
  hsnCode?: string;
  defaultGstRate: number;
  reorderLevel?: number;
  standardYieldPercent?: number;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const CtRawMaterialSchema = new Schema<ICtRawMaterial>({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: RM_CATEGORY, required: true },
  uom: { type: String, enum: UOM, required: true },
  hsnCode: { type: String, trim: true },
  defaultGstRate: { type: Number, required: true, min: 0 },
  reorderLevel: { type: Number, min: 0 },
  standardYieldPercent: { type: Number, min: 0, max: 100 },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_raw_materials' });

export default mongoose.models.CtRawMaterial || mongoose.model<ICtRawMaterial>('CtRawMaterial', CtRawMaterialSchema);
