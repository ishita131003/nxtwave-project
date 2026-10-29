import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { dataSource } from '../../api';
import { QuickShare, ReferralStrips } from '../../components/share/ShareTools';
import { referralUrl } from '../../lib/share';
import { Badge, Card, PageHeader } from '../../components/ui/Card';
import { DataView, Notice } from '../../components/ui/Feedback';
import { useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { formatDateTime } from '../../lib/dates';
import type { RefStatus, RegistrationRecord } from '../../lib/schema';

const REFERRAL_GOAL = 5;

const STATUS: Record<RegistrationRecord['status'], { label: string; tone: 'green' | 'blue' | 'red' }> = {
  registered: { label: 'Registered', tone: 'blue' },
  verified: { label: 'Registered · verified', tone: 'green' },
  rejected: { label: 'Not accepted', tone: 'red' },
};

const REF_MESSAGES: Record<Exclude<RefStatus, 'none'>, { tone: 'success' | 'warning'; text: (code: string) => string }> = {
  valid: { tone: 'success', text: (c) => `Referral code ${c} was applied. Whoever shared it gets the credit.` },
  invalid_ref: { tone: 'warning', text: (c) => `We didn't recognise the code ${c}, so nobody was credited for referring you. You're still registered.` },
  rejected_self: { tone: 'warning', text: (c) => `The code ${c} belongs to an email that matches yours, so it wasn't counted as a referral. You're still registered.` },
};

export default function StudentDashboard() {
  const session = useSession();
  const location = useLocation();
  const welcome = location.state as { justRegistered?: boolean; refStatus?: RefStatus; enteredCode?: string } | null;
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
      {({ profile, referrals, campaign }) => {
        const { user, registration, code } = profile;
        const fields = [user.name, registration.college, registration.branch, registration.year, registration.city, registration.state];
        const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);
        const counted = referrals.filter((r) => r.status === 'counted').length;
        const status = STATUS[registration.status];
        const refMessage = welcome?.refStatus && welcome.refStatus !== 'none' ? REF_MESSAGES[welcome.refStatus] : null;
        return (
          <>
            <PageHeader title={`Hi, ${user.name.split(' ')[0]}`} description={campaign.name} />
            <div className="space-y-6">
              {welcome?.justRegistered && (
                <Notice tone="success" title="You're registered">
                  Joining details will be shared with registered participants. This demo doesn't set a date or a meeting link.
                </Notice>
              )}
              {refMessage && welcome?.enteredCode && <Notice tone={refMessage.tone}>{refMessage.text(welcome.enteredCode)}</Notice>}

              <section aria-labelledby="code-heading" className="-rotate-[0.6deg]">
                <div className="relative bg-lemon px-5 pt-8 pb-5 shadow-[0_14px_22px_-14px_rgb(0_0_0/0.6)] sm:px-6">
                  <span className="pin" aria-hidden />
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b-[1.5px] border-dashed border-ink/50 pb-3">
                    <div>
                      <h2 id="code-heading" className="font-mono text-xs font-bold tracking-wide">YOUR REFERRAL CODE</h2>
                      <p className="display mt-1 font-mono text-4xl !tracking-normal sm:text-5xl">{code.code}</p>
                    </div>
                    <Link to="/student/referrals" className="flex min-h-11 items-center gap-1 text-sm font-bold underline decoration-ink/40">
                      More ways to share <ArrowRight aria-hidden className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="mt-4">
                    <QuickShare code={code.code} campaignName={campaign.name} />
                  </div>
                </div>
                <ReferralStrips code={code.code} url={referralUrl(window.location.origin, code.code, 'copy')} />
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Registration">
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink/75">Status</dt>
                      <dd>
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink/75">Registered on</dt>
                      <dd className="text-ink">{formatDateTime(registration.created_at)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-ink/75">Workshop date</dt>
                      <dd className="text-ink">To be announced</dd>
                    </div>
                  </dl>
                  <div className="mt-4 border-t border-ink/10 pt-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink/75">Profile completion</span>
                      <span className="font-semibold tabular-nums text-ink">{completion}%</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Profile completion"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={completion}
                      className="mt-2 h-3 bg-white ring-[1.5px] ring-ink"
                    >
                      <div className="h-full bg-ink" style={{ width: `${completion}%` }} />
                    </div>
                    {completion < 100 && (
                      <Link to="/student/profile" className="mt-2 inline-block text-sm font-medium text-brand-800 underline">
                        Add city and state
                      </Link>
                    )}
                  </div>
                </Card>

                <Card title="Your referrals">
                  <p className="text-3xl font-bold tabular-nums text-ink">
                    {counted} <span className="text-base font-medium text-ink/75">of {REFERRAL_GOAL} friends registered</span>
                  </p>
                  <div
                    role="progressbar"
                    aria-label={`Referrals toward a goal of ${REFERRAL_GOAL}`}
                    aria-valuemin={0}
                    aria-valuemax={REFERRAL_GOAL}
                    aria-valuenow={Math.min(counted, REFERRAL_GOAL)}
                    className="mt-3 h-3 bg-white ring-[1.5px] ring-ink"
                  >
                    <div className="h-full bg-ink" style={{ width: `${Math.min(counted / REFERRAL_GOAL, 1) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-sm text-ink/75">Counted referrals are friends who registered with your code. The goal is just a nudge; there's no prize.</p>
                </Card>
              </div>


              <nav aria-label="Quick links" className="grid gap-2 sm:grid-cols-3">
                {[
                  { to: '/student/campaign', label: 'Campaign details' },
                  { to: '/student/community', label: 'Join the community' },
                  { to: '/student/suggestions', label: 'Suggest an idea' },
                ].map((l) => (
                  <Link key={l.to} to={l.to} className="flex min-h-11 items-center justify-between rounded-[3px] bg-white px-4 py-3 text-sm font-medium text-ink ring-1 ring-ink/15 hover:ring-ink">
                    {l.label} <ArrowRight aria-hidden className="h-4 w-4 text-ink/60" />
                  </Link>
                ))}
              </nav>
            </div>
          </>
        );
      }}
    </DataView>
  );
}
