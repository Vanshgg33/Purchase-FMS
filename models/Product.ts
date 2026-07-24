import mongoose, { Schema, Document, Types } from 'mongoose';
import { UOM, Uom } from '@/types/costTracker';

export interface IProduct extends Document {
  sku: string;
  name: string;
  nameHindi?: string;
  category: string;
  packSize: number;
  packUom: Uom;
  primaryRawMaterialId: Types.ObjectId;
  sellingPrice: number;
  mrp?: number;
  packagingBomId?: Types.ObjectId;
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const ProductSchema = new Schema<IProduct>({
  sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  nameHindi: { type: String, trim: true },
  category: { type: String, required: true, trim: true },
  packSize: { type: Number, required: true, min: 0.000001 },
  packUom: { type: String, enum: UOM, required: true },
  primaryRawMaterialId: { type: Schema.Types.ObjectId, ref: 'CtRawMaterial', required: true },
  sellingPrice: { type: Number, required: true, min: 0 },
  mrp: { type: Number, min: 0 },
  packagingBomId: { type: Schema.Types.ObjectId, ref: 'PackagingBom' },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_products' });

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
