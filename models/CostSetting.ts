import mongoose, { Schema, Document } from 'mongoose';

export interface ICostSetting extends Document {
  key: string; // "marginThreshold" (default "20"), extensible
  value: string;
}

const CostSettingSchema = new Schema<ICostSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
});

export default mongoose.models.CostSetting || mongoose.model<ICostSetting>('CostSetting', CostSettingSchema);
