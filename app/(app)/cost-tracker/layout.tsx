import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toCtRole } from '@/lib/permissions';
import CtSubNav from '@/components/cost-tracker/CtSubNav';
import CtThemeRoot from '@/components/cost-tracker/CtThemeRoot';

export default async function CostTrackerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const role = toCtRole((session?.user as any)?.role);
  if (!role) redirect('/dashboard');

  return (
    <CtThemeRoot>
      <div className="page-header" style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 className="page-title display">Manufacturing Cost Tracker</h1>
          <p className="page-sub">Naturelite Foods — vendor invoice to COGS, traced batch by batch</p>
        </div>
      </div>
      <CtSubNav role={role} />
      {children}
    </CtThemeRoot>
  );
}
