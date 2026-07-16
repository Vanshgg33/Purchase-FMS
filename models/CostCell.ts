import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICostCell extends Document {
  productId: Types.ObjectId;
  columnId: Types.ObjectId;
  rawValue: string; // plain number string ("450") or formula ("=B2*0.08") — never a computed result
  updatedAt: Date;
}

const CostCellSchema = new Schema<ICostCell>({
  productId: { type: Schema.Types.ObjectId, ref: 'CostProduct', required: true },
  columnId: { type: Schema.Types.ObjectId, ref: 'CostColumn', required: true },
  rawValue: { type: String, default: '', maxlength: 500 },
}, { timestamps: true });

// one cell per product x column — upsert key
CostCellSchema.index({ productId: 1, columnId: 1 }, { unique: true });

export default mongoose.models.CostCell || mongoose.model<ICostCell>('CostCell', CostCellSchema);
