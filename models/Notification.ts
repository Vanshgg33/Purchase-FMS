import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  forUserId: string;
  poNumber: string;
  title: string;
  body: string;
  isRead: boolean;
  link?: string;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  forUserId: { type: String, required: true },
  poNumber: { type: String, default: '' },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: String,
}, { timestamps: true });

NotificationSchema.index({ forUserId: 1, isRead: 1 });

export default mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
