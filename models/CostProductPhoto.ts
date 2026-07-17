import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICostProductPhoto extends Document {
  productId: Types.ObjectId;
  url: string; // Cloudinary secure_url
  publicId?: string; // Cloudinary public_id, needed to delete the asset
  isPrimary: boolean; // primary = grid thumbnail
  position: number;
  createdAt: Date;
}

const CostProductPhotoSchema = new Schema<ICostProductPhoto>({
  productId: { type: Schema.Types.ObjectId, ref: 'CostProduct', required: true },
  url: { type: String, required: true },
  publicId: { type: String },
  isPrimary: { type: Boolean, default: false },
  position: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.CostProductPhoto || mongoose.model<ICostProductPhoto>('CostProductPhoto', CostProductPhotoSchema);
