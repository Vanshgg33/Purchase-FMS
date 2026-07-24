import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toCtRole } from '@/lib/permissions';

export default async function CostTrackerIndex() {
  const session = await getServerSession(authOptions);
  const role = toCtRole((session?.user as any)?.role);
  redirect(role === 'ADMIN' ? '/cost-tracker/dashboard' : '/cost-tracker/batches');
}
