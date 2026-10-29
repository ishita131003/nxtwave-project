import { dataSource } from '../../api';
import { ShareTools } from '../../components/share/ShareTools';
import { Badge, Card, PageHeader } from '../../components/ui/Card';
import { DataView, EmptyState } from '../../components/ui/Feedback';
import { useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { formatDay } from '../../lib/dates';
import type { ReferredPerson } from '../../api/dataSource';

const STATUS: Record<ReferredPerson['status'], { label: string; tone: 'green' | 'amber' | 'gray' }> = {
  counted: { label: 'Counted', tone: 'green' },
  self_referral: { label: 'Not counted: self-referral', tone: 'amber' },
  not_counted: { label: 'Not counted', tone: 'gray' },
};

export default function Referrals() {
  const session = useSession();
  const state = useData(
    async () => ({
      profile: await dataSource.getMyProfile(session),
      referrals: await dataSource.getMyReferrals(session),
      campaign: await dataSource.getPublicCampaign(),
    }),
    [session.token],
  );

  return (
    <DataView state={state}>
      {({ profile, referrals, campaign }) => (
        <>
          <PageHeader
            title="Refer friends"
            description={
              <>
                Your code is <span className="font-mono font-semibold text-brand-800">{profile.code.code}</span>. Every link below carries it,
                so friends who register through it are credited to you.
              </>
            }
          />
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card title="Share">
              <ShareTools code={profile.code.code} campaignName={campaign.name} />
            </Card>
            <Card title={`People you referred (${referrals.length})`}>
              {referrals.length === 0 ? (
                <EmptyState title="No one yet">Share your link in a class group to get started.</EmptyState>
              ) : (
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">People who registered with your code</caption>
                  <thead className="text-ink/75">
                    <tr>
                      <th scope="col" className="py-2 font-medium">First name</th>
                      <th scope="col" className="py-2 font-medium">Date</th>
                      <th scope="col" className="py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {referrals.map((r, i) => (
                      <tr key={i}>
                        <td className="py-2 text-ink">{r.firstName}</td>
                        <td className="py-2 tabular-nums text-ink/85">{formatDay(r.date)}</td>
                        <td className="py-2">
                          <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="mt-3 text-xs text-ink/75">For privacy you only see first names, dates and whether each referral counted.</p>
            </Card>
          </div>
        </>
      )}
    </DataView>
  );
}
