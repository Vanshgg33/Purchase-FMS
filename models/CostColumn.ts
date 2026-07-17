import mongoose, { Schema, Document } from 'mongoose';

export type CostColumnType = 'currency' | 'percent' | 'number';

export interface ICostColumn extends Document {
  label: string;
  type: CostColumnType;
  color: string;
  position: number;
  hidden: boolean;
  locked: boolean; // superadmin-only editing when true
  createdAt: Date;
}

const CostColumnSchema = new Schema<ICostColumn>({
  label: { type: String, required: true, trim: true },
  type: { type: String, enum: ['currency', 'percent', 'number'], default: 'currency' },
  color: { type: String, default: '#22D3EE' },
  position: { type: Number, required: true },
  hidden: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.CostColumn || mongoose.model<ICostColumn>('CostColumn', CostColumnSchema);
