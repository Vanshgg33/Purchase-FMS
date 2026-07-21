import mongoose, { Schema, Document } from 'mongoose';

export interface IVendor extends Document {
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  gstNumber?: string;
  photoUrl?: string;
  materialsSupplied: mongoose.Types.ObjectId[];
  isActive: boolean;
  createdAt: Date;
}

const VendorSchema = new Schema<IVendor>({
  name: { type: String, required: true },
  contactPerson: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  gstNumber: String,
  photoUrl: String,
  materialsSupplied: [{ type: Schema.Types.ObjectId, ref: 'RawMaterial' }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.models.Vendor || mongoose.model<IVendor>('Vendor', VendorSchema);
