import mongoose, { Schema, Document } from 'mongoose';

export interface ICostConstant extends Document {
  name: string; // UPPER_SNAKE: SEED_RATE, GST, DIESEL_RATE…
  value: number;
  description?: string;
}

const CostConstantSchema = new Schema<ICostConstant>({
  name: { type: String, required: true, unique: true, uppercase: true },
  value: { type: Number, required: true },
  description: { type: String, maxlength: 200 },
});

export default mongoose.models.CostConstant || mongoose.model<ICostConstant>('CostConstant', CostConstantSchema);
