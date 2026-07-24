import mongoose, { Schema, Document } from 'mongoose';
import { PKG_TYPE, UOM, PkgType, Uom } from '@/types/costTracker';

export interface IPackagingComponent extends Document {
  code: string;
  name: string;
  type: PkgType;
  uom: Uom;
  currentRate: number;
  isActive: boolean;
}

const PackagingComponentSchema = new Schema<IPackagingComponent>({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: PKG_TYPE, required: true },
  uom: { type: String, enum: UOM, required: true, default: 'PCS' },
  currentRate: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, collection: 'ct_packaging_components' });

export default mongoose.models.PackagingComponent || mongoose.model<IPackagingComponent>('PackagingComponent', PackagingComponentSchema);
