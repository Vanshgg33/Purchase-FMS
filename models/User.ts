import mongoose, { Schema, Document } from 'mongoose';

export type UserRole = 'REQUESTER' | 'PO_CREATOR' | 'APPROVER' | 'RECEIVER' | 'SUPERADMIN';

export interface IUser extends Document {
  userId: string;
  passwordHash: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
  role: UserRole;
  profilePhotoUrl?: string;
  employeeDetails?: {
    dateOfBirth?: Date;
    gender?: string;
    alternatePhone?: string;
    personalEmail?: string;
    currentAddress?: string;
    permanentAddress?: string;
    department?: string;
    dateOfJoining?: Date;
    reportingTo?: string;
    workLocation?: string;
    aadhaarNumber?: string;
    panNumber?: string;
    aadhaarUrl?: string;
    panUrl?: string;
    agreementUrl?: string;
    bankAccountHolder?: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
    emergencyContactName?: string;
    emergencyContactRelation?: string;
    emergencyContactPhone?: string;
  };
  pushSubscription?: object;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  designation: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, required: true },
  role: { type: String, enum: ['REQUESTER', 'PO_CREATOR', 'APPROVER', 'RECEIVER', 'SUPERADMIN'], required: true },
  profilePhotoUrl: String,
  employeeDetails: { type: Schema.Types.Mixed, default: {} },
  pushSubscription: Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  lastLoginAt: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
