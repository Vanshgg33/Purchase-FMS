import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const { newPassword } = await req.json();
  if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(id, { passwordHash });
  return NextResponse.json({ success: true });
}
