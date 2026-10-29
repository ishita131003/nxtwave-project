import { Card, PageHeader } from '../../components/ui/Card';
import { DataView } from '../../components/ui/Feedback';
import { usePublicCampaign } from '../../hooks/useStudent';
import { formatDay } from '../../lib/dates';

export default function CampaignDetails() {
  const campaign = usePublicCampaign();
  return (
    <DataView state={campaign}>
      {(c) => (
        <>
          <PageHeader title="Campaign details" description={c.name} />
          <div className="space-y-4">
            <Card title="The workshop">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ['Format', 'Online, about 60 minutes, hands-on'],
                  ['Cost', 'Free'],
                  ['Level', 'Beginner-friendly; no AI background needed'],
                  ['Audience', 'Engineering students in India, especially final year'],
                  ['Date and time', 'To be announced to registered participants'],
                  ['How to join', 'Joining details will be shared with registered participants'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-medium text-ink/75">{k}</dt>
                    <dd className="mt-0.5 text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card title="Registration drive">
              <p className="text-sm text-ink/85">
                Registrations open {formatDay(c.startDate)} – {formatDay(c.endDate)} with a goal of {c.target} students. So far:{' '}
                <strong className="tabular-nums">{c.validRegistrations}</strong> (demo data).
              </p>
            </Card>
            <Card title="What you'll need">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink/85">
                <li>A laptop with a modern browser</li>
                <li>A stable internet connection for about an hour</li>
                <li>Curiosity; no prior AI or ML experience is expected</li>
              </ul>
            </Card>
          </div>
        </>
      )}
    </DataView>
  );
}
