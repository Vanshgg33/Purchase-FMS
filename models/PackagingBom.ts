import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPackagingBomComponent {
  componentId: Types.ObjectId;
  qtyPerUnit: number;
  rateSnapshot: number;
}

export interface IPackagingBom extends Document {
  productId: Types.ObjectId;
  components: IPackagingBomComponent[];
  totalPackagingCostPerUnit: number;
  effectiveFrom: Date;
  isActive: boolean;
  createdBy?: Types.ObjectId;
}

const PackagingBomComponentSchema = new Schema<IPackagingBomComponent>({
  componentId: { type: Schema.Types.ObjectId, ref: 'PackagingComponent', required: true },
  qtyPerUnit: { type: Number, required: true, min: 0 },
  rateSnapshot: { type: Number, required: true, min: 0 },
}, { _id: false });

const PackagingBomSchema = new Schema<IPackagingBom>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  components: { type: [PackagingBomComponentSchema], required: true },
  totalPackagingCostPerUnit: { type: Number, required: true },
  effectiveFrom: { type: Date, required: true, default: Date.now },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_packaging_bom' });

// Only one active BOM per product
PackagingBomSchema.index({ productId: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.models.PackagingBom || mongoose.model<IPackagingBom>('PackagingBom', PackagingBomSchema);
