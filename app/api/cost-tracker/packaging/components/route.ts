import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { packagingComponentSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { generatePackagingCode } from '@/lib/costing/codes';
import PackagingComponent from '@/models/PackagingComponent';

export async function GET() {
  return ctRoute(async () => {
    await requireCapability('MANAGE_MASTERS');
    await connectDB();
    return PackagingComponent.find({ isActive: true }).sort({ name: 1 }).lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const parsed = packagingComponentSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid packaging component', { fields: zodFieldErrors(parsed.error) });

    const code = parsed.data.code || (await generatePackagingCode(PackagingComponent));
    const component = await PackagingComponent.create({ ...parsed.data, code });
    await writeAudit({ entity: 'PackagingComponent', entityId: component._id.toString(), action: 'CREATE', session });
    return component.toObject();
  });
}
