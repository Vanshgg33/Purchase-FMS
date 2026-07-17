import mongoose, { Schema, Document } from 'mongoose';

export interface ICostTotalOverride extends Document {
  productId: string; // unique — one override per product, custom Batch Total formula replacing =SUM(row)
  formula: string;
}

const CostTotalOverrideSchema = new Schema<ICostTotalOverride>({
  productId: { type: String, required: true, unique: true },
  formula: { type: String, required: true, maxlength: 500 },
});

export default mongoose.models.CostTotalOverride || mongoose.model<ICostTotalOverride>('CostTotalOverride', CostTotalOverrideSchema);
