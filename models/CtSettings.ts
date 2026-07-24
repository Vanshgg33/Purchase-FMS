import mongoose, { Schema, Document } from 'mongoose';
import { GST_TREATMENT, GstTreatment } from '@/types/costTracker';

export interface ICtSettings extends Document {
  gstTreatment: GstTreatment;
  roundingMode: 'HALF_UP';
  overheadBasis: 'OUTPUT_VOLUME';
  defaultCurrency: string;
  timezone: string;
  financialYearStartMonth: number;
}

const CtSettingsSchema = new Schema<ICtSettings>({
  gstTreatment: { type: String, enum: GST_TREATMENT, required: true, default: 'INCLUSIVE' },
  roundingMode: { type: String, enum: ['HALF_UP'], required: true, default: 'HALF_UP' },
  overheadBasis: { type: String, enum: ['OUTPUT_VOLUME'], required: true, default: 'OUTPUT_VOLUME' },
  defaultCurrency: { type: String, required: true, default: 'INR' },
  timezone: { type: String, required: true, default: 'Asia/Kolkata' },
  financialYearStartMonth: { type: Number, required: true, default: 4 },
}, { timestamps: true, collection: 'ct_settings' });

export default mongoose.models.CtSettings || mongoose.model<ICtSettings>('CtSettings', CtSettingsSchema);
