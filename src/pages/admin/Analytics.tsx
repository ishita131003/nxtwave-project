import { Download } from 'lucide-react';
import { useState } from 'react';
import { FilterBar } from '../../components/admin/Filters';
import { ChartFigure, DataTable, GroupedBarChart } from '../../components/charts/Charts';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { DataView, EmptyState } from '../../components/ui/Feedback';
import { useMetricsData } from '../../hooks/useAdmin';
import { downloadText, toCsv } from '../../lib/csv';
import { dayRange, formatDay } from '../../lib/dates';
import { eventsByDay, formatPercent, funnel, type Filters, type MetricsData } from '../../lib/metrics';

const STEP_LABELS = {
  landing_view: 'Landing page views',
  register_view: 'Register page views',
  register_success: 'Successful registrations',
  ref_link_open: 'Referral link opens (unverified)',
} as const;

function AnalyticsBody({ data }: { data: MetricsData }) {
  const [range, setRange] = useState<Filters>({});
  const f = funnel(data.events, range);
  const days = dayRange(range.from ?? data.settings.start_date, range.to ?? data.settings.end_date);
  const byDay = eventsByDay(data.events, days);
  const chartRows = f.steps.map((s) => ({ label: STEP_LABELS[s.type].replace(' page views', ' views'), sessions: s.sessions }));

  function exportCsv() {
    const csv = toCsv(byDay, [
      { key: 'day', header: 'day_ist' },
      { key: 'landing_view', header: 'landing_view_sessions' },
      { key: 'register_view', header: 'register_view_sessions' },
      { key: 'register_success', header: 'register_success_sessions' },
      { key: 'ref_link_open', header: 'ref_link_open_sessions_unverified' },
    ]);
    downloadText(`funnel-events-${days[0]}-to-${days.at(-1)}.csv`, csv);
  }

  return (
    <>
      <FilterBar value={range} onChange={setRange} settings={data.settings} show={['date']} />
      {f.counts.landing_view === 0 && f.counts.register_success === 0 ? (
        <EmptyState title="No tracked events in this range" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Funnel (distinct sessions)">
            <ChartFigure
              title="Registration funnel by distinct sessions"
              summary={f.steps.map((s) => `${STEP_LABELS[s.type]}: ${s.sessions}`).join('; ')}
              table={
                <DataTable
                  caption="Funnel steps"
                  headers={['Step', 'Sessions', 'From previous step']}
                  rows={f.steps.map((s) => [STEP_LABELS[s.type], s.sessions, formatPercent(s.fromPrevious)])}
                />
              }
            >
              <GroupedBarChart data={chartRows} series={[{ key: 'sessions', name: 'Sessions' }]} />
            </ChartFigure>
            <ol className="mt-4 space-y-2 text-sm">
              {f.steps.map((s) => (
                <li key={s.type} className="flex justify-between gap-3">
                  <span className="text-ink/85">{STEP_LABELS[s.type]}</span>
                  <span className="tabular-nums text-ink">
                    {s.sessions}
                    {s.fromPrevious !== null && <span className="text-ink/75"> · {formatPercent(s.fromPrevious)} of previous</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="What this counts">
            <ul className="list-disc space-y-2 pl-5 text-sm text-ink/85">
              <li>Built only from the append-only event log: each step counts distinct anonymous sessions that fired the event.</li>
              <li>
                Referral link opens: <strong className="tabular-nums">{f.counts.ref_link_open}</strong> sessions. Unverified: they can't prove a real
                person opened the link.
              </li>
              <li>
                Successful registrations here are events, not registration rows. They can differ from valid registrations (for example after an admin
                rejects one).
              </li>
              <li>Days are bucketed in IST.</li>
            </ul>
          </Card>
          <Card
            title="Events by day"
            className="lg:col-span-2"
            actions={
              <Button variant="secondary" onClick={exportCsv}>
                <Download aria-hidden className="h-4 w-4" /> Export CSV
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <DataTable
                caption="Distinct sessions per event type per day"
                headers={['Day', 'Landing views', 'Register views', 'Successes', 'Ref opens (unverified)']}
                rows={byDay.map((r) => [formatDay(String(r.day)), r.landing_view, r.register_view, r.register_success, r.ref_link_open])}
              />
            </div>
          </Card>
        </div>
      )}
    </>
  );
}

export default function AdminAnalytics() {
  const state = useMetricsData();
  return (
    <>
      <PageHeader title="Analytics" description="Funnel from tracked events only. No personal data is stored with events." />
      <DataView state={state}>{(data) => <AnalyticsBody data={data} />}</DataView>
    </>
  );
}
