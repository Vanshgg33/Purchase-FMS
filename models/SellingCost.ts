import mongoose, { Schema, Document, Types } from 'mongoose';
import { CHANNEL, Channel } from '@/types/costTracker';

export interface ISellingCost extends Document {
  productId: Types.ObjectId;
  effectiveFrom: Date;
  channel: Channel;
  shippingPerUnit: number;
  adSpendPerUnit: number;
  paymentGatewayPercent: number;
  rtoProvisionPerUnit: number;
  discountPerUnit: number;
  supportCostPerUnit: number;
  isActive: boolean;
}

const SellingCostSchema = new Schema<ISellingCost>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  effectiveFrom: { type: Date, required: true, default: Date.now },
  channel: { type: String, enum: CHANNEL, required: true },
  shippingPerUnit: { type: Number, required: true, min: 0 },
  adSpendPerUnit: { type: Number, required: true, min: 0 },
  paymentGatewayPercent: { type: Number, required: true, min: 0 },
  rtoProvisionPerUnit: { type: Number, required: true, min: 0 },
  discountPerUnit: { type: Number, required: true, min: 0 },
  supportCostPerUnit: { type: Number, required: true, min: 0 },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, collection: 'ct_selling_costs' });

// Only one active row per product+channel
SellingCostSchema.index({ productId: 1, channel: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

export default mongoose.models.SellingCost || mongoose.model<ISellingCost>('SellingCost', SellingCostSchema);
