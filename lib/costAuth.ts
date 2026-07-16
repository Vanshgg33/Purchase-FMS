import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Cost Tracker exposes company costing data — restrict to SUPERADMIN, like Materials/Vendors/Reports. */
export async function requireCostAdmin() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== 'SUPERADMIN') return null;
  return session;
}
