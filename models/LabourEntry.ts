import mongoose, { Schema, Document, Types } from 'mongoose';
import { LABOUR_TYPE, LabourType } from '@/types/costTracker';

export interface ILabourEntry extends Document {
  batchId: Types.ObjectId;
  labourType: LabourType;
  workerCount: number;
  hours: number;
  totalHours: number;
  hourlyRate: number;
  lineCost: number;
}

const LabourEntrySchema = new Schema<ILabourEntry>({
  batchId: { type: Schema.Types.ObjectId, ref: 'ProductionBatch', required: true, index: true },
  labourType: { type: String, enum: LABOUR_TYPE, required: true },
  workerCount: { type: Number, required: true, min: 1 },
  hours: { type: Number, required: true, min: 0.000001 },
  totalHours: { type: Number, required: true },
  hourlyRate: { type: Number, required: true, min: 0 },
  lineCost: { type: Number, required: true },
}, { timestamps: true, collection: 'ct_labour_entries' });

export default mongoose.models.LabourEntry || mongoose.model<ILabourEntry>('LabourEntry', LabourEntrySchema);
