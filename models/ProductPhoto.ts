import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IProductPhoto extends Document {
  productId: Types.ObjectId;
  url: string; // Cloudinary secure_url
  publicId?: string; // Cloudinary public_id, needed to delete the asset
  isPrimary: boolean;
  position: number;
  createdAt: Date;
}

const ProductPhotoSchema = new Schema<IProductPhoto>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  url: { type: String, required: true },
  publicId: { type: String },
  isPrimary: { type: Boolean, default: false },
  position: { type: Number, default: 0 },
}, { timestamps: true, collection: 'ct_product_photos' });

export default mongoose.models.ProductPhoto || mongoose.model<IProductPhoto>('ProductPhoto', ProductPhotoSchema);
