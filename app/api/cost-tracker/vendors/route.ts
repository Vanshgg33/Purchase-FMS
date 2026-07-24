import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { vendorSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { generateVendorCode } from '@/lib/costing/codes';
import CtVendor from '@/models/CtVendor';

export async function GET() {
  return ctRoute(async () => {
    await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const vendors = await CtVendor.find({}).sort({ name: 1 }).lean();
    return vendors;
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const parsed = vendorSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid vendor data', { fields: zodFieldErrors(parsed.error) });

    const code = parsed.data.code || (await generateVendorCode(CtVendor));
    const vendor = await CtVendor.create({ ...parsed.data, code, state: parsed.data.state || 'Chhattisgarh', createdBy: session.userId });
    await writeAudit({ entity: 'CtVendor', entityId: vendor._id.toString(), action: 'CREATE', session });
    return vendor.toObject();
  });
}
