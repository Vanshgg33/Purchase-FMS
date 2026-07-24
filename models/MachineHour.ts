import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMachineHour extends Document {
  batchId: Types.ObjectId;
  machineName: string;
  hours: number;
  electricityRatePerHour: number;
  lineCost: number;
}

const MachineHourSchema = new Schema<IMachineHour>({
  batchId: { type: Schema.Types.ObjectId, ref: 'ProductionBatch', required: true, index: true },
  machineName: { type: String, required: true, trim: true },
  hours: { type: Number, required: true, min: 0.000001 },
  electricityRatePerHour: { type: Number, required: true, min: 0 },
  lineCost: { type: Number, required: true },
}, { timestamps: true, collection: 'ct_machine_hours' });

export default mongoose.models.MachineHour || mongoose.model<IMachineHour>('MachineHour', MachineHourSchema);
