import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function GET() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 }).lean();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { userId, name, designation, phone, email, role, password } = await req.json();
  if (!userId || !name || !email || !password || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  const exists = await User.findOne({ userId });
  if (exists) return NextResponse.json({ error: 'User ID already exists' }, { status: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ userId, name, designation, phone, email, role, passwordHash, isActive: true });
  return NextResponse.json({ user: { _id: user._id, userId, name, role } });
}
