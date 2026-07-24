import mongoose, { Schema, Document } from 'mongoose';

export interface ICtVendor extends Document {
  code: string;
  name: string;
  gstin?: string;
  phone?: string;
  city: string;
  state: string;
  paymentTerms?: string;
  isActive: boolean;
  createdBy?: mongoose.Types.ObjectId;
}

const CtVendorSchema = new Schema<ICtVendor>({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true },
  name: { type: String, required: true, trim: true },
  gstin: { type: String, trim: true, uppercase: true },
  phone: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, default: 'Chhattisgarh', trim: true },
  paymentTerms: { type: String, trim: true },
  isActive: { type: Boolean, required: true, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true, collection: 'ct_vendors' });

export default mongoose.models.CtVendor || mongoose.model<ICtVendor>('CtVendor', CtVendorSchema);
