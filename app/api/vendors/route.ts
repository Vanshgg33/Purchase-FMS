import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const url = new URL(req.url);
  const all = url.searchParams.get('all') === '1' && (session.user as any)?.role === 'SUPERADMIN';
  const vendors = await Vendor.find(all ? {} : { isActive: true }).sort({ name: 1 }).lean();
  return NextResponse.json({ vendors });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();
  const vendor = await Vendor.create(body);
  return NextResponse.json({ vendor });
}
