import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
  _id: any;
  year: number;
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  year: { type: Number, required: true },
  seq: { type: Number, default: 0 },
});

export async function getNextPONumber(): Promise<string> {
  const year = new Date().getFullYear();
  const Counter = mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
  const counter = await Counter.findByIdAndUpdate(
    'poNumber',
    { $inc: { seq: 1 }, $set: { year } },
    { returnDocument: 'after', upsert: true }
  );
  return `PO-${year}-${String(counter.seq).padStart(4, '0')}`;
}

export default mongoose.models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);
