import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const { password: _pw, userId: _uid, ...updates } = body;
  const user = await User.findByIdAndUpdate(id, updates, { new: true, select: '-passwordHash' });
  return NextResponse.json({ user });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const caller = session?.user as any;
  if (caller?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { id } = await params;
  const target = await User.findById(id);
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.userId === caller.userId) return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  await User.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
