import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { sellingCostSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import SellingCost from '@/models/SellingCost';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    await requireCapability('MANAGE_RATES');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get('productId')) query.productId = searchParams.get('productId');
    return SellingCost.find(query).populate('productId', 'sku name sellingPrice').sort({ createdAt: -1 }).lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_RATES');
    await connectDB();
    const parsed = sellingCostSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid selling cost data', { fields: zodFieldErrors(parsed.error) });
    const data = parsed.data;

    // Only one active row per product+channel (R17)
    await SellingCost.updateMany({ productId: data.productId, channel: data.channel, isActive: true }, { $set: { isActive: false } });
    const row = await SellingCost.create({ ...data, effectiveFrom: data.effectiveFrom || new Date(), isActive: true });

    await writeAudit({ entity: 'SellingCost', entityId: row._id.toString(), action: 'CREATE', session });
    return row.toObject();
  });
}
