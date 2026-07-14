import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { text } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: 'Empty comment' }, { status: 400 });

  await PurchaseOrder.findByIdAndUpdate(id, {
    $push: { comments: { byUserId: user.userId, byName: user.name, text, at: new Date() } },
  });

  return NextResponse.json({ success: true });
}
