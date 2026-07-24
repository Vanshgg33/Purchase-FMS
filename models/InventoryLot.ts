import mongoose, { Schema, Document, Types } from 'mongoose';
import { LOT_STATUS, UOM, LotStatus, Uom } from '@/types/costTracker';

export interface IInventoryLot extends Document {
  lotCode: string;
  rawMaterialId: Types.ObjectId;
  purchaseId: Types.ObjectId;
  vendorId: Types.ObjectId;
  receivedDate: Date;
  originalQuantity: number;
  availableQuantity: number;
  consumedQuantity: number;
  uom: Uom;
  landedCostPerUnit: number;
  status: LotStatus;
}

const InventoryLotSchema = new Schema<IInventoryLot>({
  lotCode: { type: String, required: true, unique: true },
  rawMaterialId: { type: Schema.Types.ObjectId, ref: 'CtRawMaterial', required: true, index: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: 'CtVendor', required: true },
  receivedDate: { type: Date, required: true, index: true },
  originalQuantity: { type: Number, required: true, immutable: true, min: 0 },
  availableQuantity: { type: Number, required: true, min: 0 },
  consumedQuantity: { type: Number, required: true, default: 0, min: 0 },
  uom: { type: String, enum: UOM, required: true },
  landedCostPerUnit: { type: Number, required: true, immutable: true },
  status: { type: String, enum: LOT_STATUS, required: true, default: 'AVAILABLE' },
}, { timestamps: true, collection: 'ct_inventory_lots' });

InventoryLotSchema.index({ rawMaterialId: 1, status: 1, receivedDate: 1 });

export default mongoose.models.InventoryLot || mongoose.model<IInventoryLot>('InventoryLot', InventoryLotSchema);
