import mongoose, { Schema, Document } from 'mongoose';
import { RATE_TYPE, RateType } from '@/types/costTracker';

export interface IRateMaster extends Document {
  rateType: RateType;
  label: string;
  rate: number;
  effectiveFrom: Date;
  isActive: boolean;
}

const RateMasterSchema = new Schema<IRateMaster>({
  rateType: { type: String, enum: RATE_TYPE, required: true, index: true },
  label: { type: String, required: true, trim: true },
  rate: { type: Number, required: true, min: 0 },
  effectiveFrom: { type: Date, required: true },
  isActive: { type: Boolean, required: true, default: true },
}, { timestamps: true, collection: 'ct_rate_masters' });

RateMasterSchema.index({ rateType: 1, effectiveFrom: -1 });

export default mongoose.models.RateMaster || mongoose.model<IRateMaster>('RateMaster', RateMasterSchema);
