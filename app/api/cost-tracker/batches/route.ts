import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { batchCreateSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { generateBatchCode } from '@/lib/costing/codes';
import ProductionBatch from '@/models/ProductionBatch';

export async function GET(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('CREATE_BATCH');
    await connectDB();
    const { searchParams } = new URL(req.url);
    const query: Record<string, unknown> = {};
    if (searchParams.get('productId')) query.productId = searchParams.get('productId');
    if (searchParams.get('status')) query.status = searchParams.get('status');

    const batches = await ProductionBatch.find(query).populate('productId', 'sku name').sort({ productionDate: -1 }).lean();
    if (session.role === 'PRODUCTION') {
      return batches.map((b: any) => ({ ...b, costs: undefined, snapshot: undefined }));
    }
    return batches;
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('CREATE_BATCH');
    await connectDB();
    const parsed = batchCreateSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid batch data', { fields: zodFieldErrors(parsed.error) });

    const batchCode = await generateBatchCode(ProductionBatch);
    const batch = await ProductionBatch.create({
      batchCode,
      ...parsed.data,
      status: 'DRAFT',
      createdBy: session.userId,
    });
    await writeAudit({ entity: 'ProductionBatch', entityId: batch._id.toString(), action: 'CREATE', session });
    return batch.toObject();
  });
}
