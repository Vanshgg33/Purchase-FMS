import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { oldPassword, newPassword } = await req.json();
  const user = await User.findOne({ userId: sessionUser.userId });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return NextResponse.json({ success: true });
}
