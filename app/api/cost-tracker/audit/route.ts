import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import CtAuditLog from '@/models/CtAuditLog';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    await requireCapability('VIEW_AUDIT');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get('entity')) query.entity = searchParams.get('entity');
    if (searchParams.get('action')) query.action = searchParams.get('action');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const [logs, total] = await Promise.all([
      CtAuditLog.find(query).sort({ at: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CtAuditLog.countDocuments(query),
    ]);
    return { logs, page, total, limit };
  });
}
