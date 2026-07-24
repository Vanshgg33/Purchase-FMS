import { NextRequest } from 'next/server';
import { requireCapability } from '@/lib/permissions';
import { connectDB } from '@/lib/mongodb';
import { ctRoute } from '@/lib/costApi';
import { zodFieldErrors, reopenSchema } from '@/lib/costValidation';
import { AppError } from '@/lib/costErrors';
import { reopenBatch } from '@/lib/costing/recost';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ctRoute(async () => {
    const session = await requireCapability('REOPEN_BATCH');
    await connectDB();
    const { id } = await params;
    const parsed = reopenSchema.safeParse(await req.json());
    if (!parsed.success) throw new AppError('REASON_REQUIRED', 'Reopen reason must be at least 10 characters', { fields: zodFieldErrors(parsed.error) });

    const batch = await reopenBatch(id, parsed.data.reason, session);
    return batch.toObject();
  });
}
