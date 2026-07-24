import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { rateMasterSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import RateMaster from '@/models/RateMaster';

export async function GET() {
  return ctRoute(async () => {
    await requireCapability('MANAGE_RATES');
    await connectDB();
    return RateMaster.find({}).sort({ rateType: 1, effectiveFrom: -1 }).lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_RATES');
    await connectDB();
    const parsed = rateMasterSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid rate', { fields: zodFieldErrors(parsed.error) });

    const rate = await RateMaster.create({ ...parsed.data, isActive: true });
    await writeAudit({ entity: 'RateMaster', entityId: rate._id.toString(), action: 'CREATE', session });
    return rate.toObject();
  });
}
