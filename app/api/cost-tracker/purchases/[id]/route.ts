import { requireCapability } from '@/lib/permissions';
import { connectDB } from '@/lib/mongodb';
import { ctRoute } from '@/lib/costApi';
import { AppError } from '@/lib/costErrors';
import Purchase from '@/models/Purchase';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    await requireCapability('CREATE_PURCHASE');
    await connectDB();
    const { id } = await params;
    const purchase = await Purchase.findById(id).populate('vendorId').populate('items.rawMaterialId').lean();
    if (!purchase) throw new AppError('NOT_FOUND', 'Purchase not found');
    return purchase;
  });
}
