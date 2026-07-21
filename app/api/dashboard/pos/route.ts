import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import PurchaseOrder from '@/models/PurchaseOrder';
import User from '@/models/User';
import Vendor from '@/models/Vendor';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const pos = await PurchaseOrder.find({}, 'poNumber status materials requestedBy requestedByName deadlines updatedAt createdAt vendor')
    .sort({ createdAt: -1 }).limit(100).lean();

  const userIds = [...new Set(pos.map(po => po.requestedBy).filter(Boolean))];
  const vendorIds = [...new Set(pos.map(po => po.vendor?.vendorId?.toString()).filter(Boolean))];

  const [users, vendors] = await Promise.all([
    User.find({ userId: { $in: userIds } }, 'userId profilePhotoUrl').lean(),
    Vendor.find({ _id: { $in: vendorIds } }, 'photoUrl').lean(),
  ]);
  const userPhotoByUserId = new Map(users.map(u => [u.userId, u.profilePhotoUrl || null]));
  const vendorPhotoById = new Map(vendors.map(v => [v._id.toString(), v.photoUrl || null]));

  const enriched = pos.map(po => ({
    ...po,
    requestedByPhoto: userPhotoByUserId.get(po.requestedBy) || null,
    vendorPhoto: po.vendor?.vendorId ? vendorPhotoById.get(po.vendor.vendorId.toString()) || null : null,
  }));

  return NextResponse.json({ pos: enriched });
}
