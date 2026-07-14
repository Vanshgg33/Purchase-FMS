import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import RawMaterial from '@/models/RawMaterial';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const url = new URL(req.url);
  const all = url.searchParams.get('all') === '1' && (session.user as any)?.role === 'SUPERADMIN';
  const materials = await RawMaterial.find(all ? {} : { isActive: true }).sort({ name: 1 }).lean();
  return NextResponse.json({ materials });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user || user.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const mat = await RawMaterial.create({ ...body, addedBy: user.userId });
  return NextResponse.json({ material: mat });
}
