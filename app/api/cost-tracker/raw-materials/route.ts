import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireCapability } from '@/lib/permissions';
import { ctRoute } from '@/lib/costApi';
import { writeAudit } from '@/lib/costAudit';
import { rawMaterialSchema, zodFieldErrors } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { generateRawMaterialCode } from '@/lib/costing/codes';
import CtRawMaterial from '@/models/CtRawMaterial';

export async function GET() {
  return ctRoute(async () => {
    await requireCapability('MANAGE_MASTERS');
    await connectDB();
    return CtRawMaterial.find({}).sort({ name: 1 }).lean();
  });
}

export async function POST(req: NextRequest) {
  return ctRoute(async () => {
    const session = await requireCapability('MANAGE_MASTERS');
    await connectDB();
    const parsed = rawMaterialSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'Invalid raw material data', { fields: zodFieldErrors(parsed.error) });

    const code = parsed.data.code || (await generateRawMaterialCode(CtRawMaterial));
    const material = await CtRawMaterial.create({ ...parsed.data, code, createdBy: session.userId });
    await writeAudit({ entity: 'CtRawMaterial', entityId: material._id.toString(), action: 'CREATE', session });
    return material.toObject();
  });
}
