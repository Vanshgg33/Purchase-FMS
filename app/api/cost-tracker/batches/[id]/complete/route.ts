import { requireCapability } from '@/lib/permissions';
import { connectDB } from '@/lib/mongodb';
import { ctRoute } from '@/lib/costApi';
import { completeBatch } from '@/lib/costing/recost';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('COMPLETE_BATCH');
    await connectDB();
    const { id } = await params;
    const batch = await completeBatch(id, session);
    return batch.toObject();
  });
}
