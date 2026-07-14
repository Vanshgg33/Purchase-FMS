import { connectDB } from './mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function createNotification(forUserId: string, title: string, body: string, poNumber: string, link?: string) {
  await connectDB();
  await Notification.create({ forUserId, title, body, poNumber, link: link || `/po/${poNumber}` });
}

export async function notifyByRole(roles: string[], title: string, body: string, poNumber: string) {
  await connectDB();
  const users = await User.find({ role: { $in: roles }, isActive: true }, 'userId');
  await Promise.all(users.map(u => createNotification(u.userId, title, body, poNumber)));
}

export async function notifyUsers(userIds: string[], title: string, body: string, poNumber: string) {
  await connectDB();
  await Promise.all(userIds.map(id => createNotification(id, title, body, poNumber)));
}
