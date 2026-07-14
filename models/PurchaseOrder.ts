import mongoose, { Schema, Document } from 'mongoose';

export type POStatus =
  | 'REQUESTED'
  | 'PO_CREATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_TO_VENDOR'
  | 'BILL_UPLOADED'
  | 'RECEIVED'
  | 'PARTIALLY_RECEIVED'
  | 'CLOSED'
  | 'CANCELLED';

export interface IMaterial {
  materialId: mongoose.Types.ObjectId;
  name: string;
  requestedQty: number;
  orderedQty?: number;
  receivedQty?: number;
  differenceQty?: number;
  expectedRate?: number;
}

export interface ITimelineEntry {
  action: string;
  byUserId: string;
  byName: string;
  at: Date;
  note?: string;
}

export interface IAttachment {
  fileUrl: string;
  fileType: 'pdf' | 'image';
  label: string;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface IPurchaseOrder extends Document {
  poNumber: string;
  requestNumber?: string;
  status: POStatus;
  materials: IMaterial[];
  requestRemark?: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: Date;
  vendor?: {
    vendorId: mongoose.Types.ObjectId;
    name: string;
    phone?: string;
  };
  expectedRate?: number;
  poCreatedBy?: string;
  poCreatedByName?: string;
  poCreatedAt?: Date;
  approval?: {
    decidedBy?: string;
    decidedByName?: string;
    decidedAt?: Date;
    decision?: 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  };
  vendorBill?: IAttachment;
  physicalBill?: IAttachment;
  receiving?: {
    receivedBy?: string;
    receivedByName?: string;
    receivedAt?: Date;
    conditionRemark?: string;
    hasDiscrepancy?: boolean;
  };
  deadlines: {
    neededBy?: Date;
    poDeadline?: Date;
    approvalDeadline?: Date;
    deliveryDeadline?: Date;
    stepDeadlines: Array<{ step: string; deadline: Date; completedAt?: Date; wasLate?: boolean }>;
  };
  timeline: ITimelineEntry[];
  attachments: IAttachment[];
  comments: Array<{ byUserId: string; byName: string; text: string; at: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  fileUrl: String,
  fileType: { type: String, enum: ['pdf', 'image'] },
  label: String,
  uploadedBy: String,
  uploadedAt: Date,
}, { _id: false });

const PurchaseOrderSchema = new Schema<IPurchaseOrder>({
  poNumber: { type: String, required: true, unique: true },
  requestNumber: String,
  status: {
    type: String,
    enum: ['REQUESTED', 'PO_CREATED', 'APPROVED', 'REJECTED', 'SENT_TO_VENDOR', 'BILL_UPLOADED', 'RECEIVED', 'PARTIALLY_RECEIVED', 'CLOSED', 'CANCELLED'],
    default: 'REQUESTED',
  },
  materials: [{
    materialId: { type: Schema.Types.ObjectId, ref: 'RawMaterial' },
    name: String,
    requestedQty: Number,
    orderedQty: Number,
    receivedQty: Number,
    differenceQty: Number,
    expectedRate: Number,
  }],
  requestRemark: String,
  requestedBy: { type: String, required: true },
  requestedByName: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  vendor: {
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },
    name: String,
    phone: String,
  },
  poCreatedBy: String,
  poCreatedByName: String,
  poCreatedAt: Date,
  approval: {
    decidedBy: String,
    decidedByName: String,
    decidedAt: Date,
    decision: { type: String, enum: ['APPROVED', 'REJECTED'] },
    rejectionReason: String,
  },
  vendorBill: AttachmentSchema,
  physicalBill: AttachmentSchema,
  receiving: {
    receivedBy: String,
    receivedByName: String,
    receivedAt: Date,
    conditionRemark: String,
    hasDiscrepancy: Boolean,
  },
  deadlines: {
    neededBy: Date,
    poDeadline: Date,
    approvalDeadline: Date,
    deliveryDeadline: Date,
    stepDeadlines: [{
      step: String,
      deadline: Date,
      completedAt: Date,
      wasLate: Boolean,
    }],
  },
  timeline: [{
    action: String,
    byUserId: String,
    byName: String,
    at: { type: Date, default: Date.now },
    note: String,
  }],
  attachments: [AttachmentSchema],
  comments: [{
    byUserId: String,
    byName: String,
    text: String,
    at: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

PurchaseOrderSchema.index({ status: 1 });
PurchaseOrderSchema.index({ requestedBy: 1 });
PurchaseOrderSchema.index({ createdAt: -1 });

export default mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
