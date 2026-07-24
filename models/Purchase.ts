import mongoose, { Schema, Document, Types } from 'mongoose';
import { PURCHASE_STATUS, UOM, PurchaseStatus, Uom } from '@/types/costTracker';

export interface IPurchaseItem {
  rawMaterialId: Types.ObjectId;
  quantity: number;
  uom: Uom;
  ratePerUnit: number;
  taxableValue: number;
  gstRate: number;
  gstValue: number;
  allocatedFreight: number;
  allocatedLoading: number;
  allocatedOther: number;
  landedValue: number;
  landedCostPerUnit: number;
}

export interface IPurchase extends Document {
  code: string;
  vendorId: Types.ObjectId;
  invoiceNo: string;
  invoiceDate: Date;
  receivedDate: Date;
  items: IPurchaseItem[];
  freightCharges: number;
  loadingCharges: number;
  otherCharges: number;
  otherChargesNote?: string;
  basicAmount: number;
  gstAmount: number;
  totalLandedAmount: number;
  status: PurchaseStatus;
  notes?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

const PurchaseItemSchema = new Schema<IPurchaseItem>({
  rawMaterialId: { type: Schema.Types.ObjectId, ref: 'CtRawMaterial', required: true },
  quantity: { type: Number, required: true, min: 0.000001 },
  uom: { type: String, enum: UOM, required: true },
  ratePerUnit: { type: Number, required: true, min: 0.000001 },
  taxableValue: { type: Number, required: true },
  gstRate: { type: Number, required: true, min: 0 },
  gstValue: { type: Number, required: true },
  allocatedFreight: { type: Number, required: true, default: 0 },
  allocatedLoading: { type: Number, required: true, default: 0 },
  allocatedOther: { type: Number, required: true, default: 0 },
  landedValue: { type: Number, required: true },
  landedCostPerUnit: { type: Number, required: true },
}, { _id: true });

const PurchaseSchema = new Schema<IPurchase>({
  code: { type: String, required: true, unique: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'CtVendor', required: true },
  invoiceNo: { type: String, required: true, trim: true },
  invoiceDate: { type: Date, required: true },
  receivedDate: { type: Date, required: true },
  items: { type: [PurchaseItemSchema], required: true, validate: (v: IPurchaseItem[]) => v.length >= 1 },
  freightCharges: { type: Number, required: true, default: 0, min: 0 },
  loadingCharges: { type: Number, required: true, default: 0, min: 0 },
  otherCharges: { type: Number, required: true, default: 0, min: 0 },
  otherChargesNote: { type: String, trim: true },
  basicAmount: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  totalLandedAmount: { type: Number, required: true },
  status: { type: String, enum: PURCHASE_STATUS, required: true, default: 'DRAFT' },
  notes: { type: String, trim: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_purchases' });

PurchaseSchema.index({ vendorId: 1, receivedDate: -1 });
PurchaseSchema.index({ status: 1 });

export default mongoose.models.Purchase || mongoose.model<IPurchase>('Purchase', PurchaseSchema);
