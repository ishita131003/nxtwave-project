import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DecisionView } from '../../components/admin/DecisionView';
import { FilterBar, uniqueSorted } from '../../components/admin/Filters';
import { ChartFigure, DailyLineChart, DataTable, GroupedBarChart } from '../../components/charts/Charts';
import { Card, Kpi, PageHeader } from '../../components/ui/Card';
import { DataView, EmptyState } from '../../components/ui/Feedback';
import { useMetricsData } from '../../hooks/useAdmin';
import { formatDay } from '../../lib/dates';
import {
  codeStats,
  collegeBreakdown,
  dailySeries,
  day3Decision,
  formatPercent,
  kpis,
  sourceBreakdown,
  type Filters,
  type MetricsData,
} from '../../lib/metrics';
import { SOURCE_LABELS } from '../../lib/schema';

function DashboardBody({ data }: { data: MetricsData }) {
  const [filters, setFilters] = useState<Filters>({});
  const now = new Date();
  const colleges = useMemo(() => uniqueSorted(data.registrations.map((r) => r.college)), [data]);
  const branches = useMemo(() => uniqueSorted(data.registrations.map((r) => r.branch)), [data]);
  const k = kpis(data, filters, now);
  const daily = dailySeries(data, filters).map((p) => ({ ...p, label: `D${p.dayNumber} · ${formatDay(p.day)}` }));
  const sources = sourceBreakdown(data, filters);
  const sourceRows = sources.rows.filter((r) => r.observed || r.selfReported).map((r) => ({ ...r, label: SOURCE_LABELS[r.channel] }));
  const collegeRows = collegeBreakdown(data, filters).map((c) => ({ label: c.name.replace(' (fictional)', ''), count: c.count }));
  const topCodes = codeStats(data, { from: filters.from, to: filters.to }).filter((c) => c.valid > 0).slice(0, 5);

  return (
    <>
      <FilterBar value={filters} onChange={setFilters} settings={data.settings} colleges={colleges} branches={branches} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi lead label="Valid registrations" value={k.valid} sub={`${k.total} rows · ${k.suspectedDuplicates} suspected duplicates`} />
        <Kpi label="Target" value={k.target} sub={`${k.remaining} remaining`} />
        <Kpi label="Progress" value={`${k.percent}%`} sub="of target" />
        <Kpi label="Today (IST)" value={k.today} sub="valid registrations" />
        <Kpi label="Referred" value={k.referred} sub={`${k.invalidRef} invalid code · ${k.rejectedSelf} self-referral`} />
        <Kpi label="Active channels" value={k.activeChannels} sub="observed, with ≥1 registration" />
      </div>

      {k.valid === 0 ? (
        <div className="mt-4">
          <EmptyState title="No registrations match these filters">Clear the filters to see all data.</EmptyState>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card
            title="Valid registrations per day vs target"
            actions={
              <Link to="/admin/campaigns" className="text-sm font-medium text-brand-800 underline">
                Edit target curve
              </Link>
            }
            className="lg:col-span-2"
          >
            <p className="mb-3 text-sm text-ink/75">
              {daily.reduce((s, p) => s + p.valid, 0)} valid against a cumulative target of {daily.at(-1)?.cumulativeTarget ?? 0} by{' '}
              {daily.at(-1) ? formatDay(daily.at(-1)!.day) : 'the end'}. The dashed line is the editable daily target.
            </p>
            <ChartFigure
              title="Valid registrations per day versus daily target"
              summary={`${daily.reduce((s, p) => s + p.valid, 0)} valid registrations over ${daily.length} days against a target of ${daily.reduce((s, p) => s + p.target, 0)}.`}
              table={
                <DataTable
                  caption="Daily valid registrations and target"
                  headers={['Day', 'Valid', 'Target', 'Cumulative', 'Cumulative target']}
                  rows={daily.map((p) => [p.label, p.valid, p.target, p.cumulative, p.cumulativeTarget])}
                />
              }
            >
              <DailyLineChart data={daily} />
            </ChartFigure>
          </Card>

          <Card title="Source: observed vs self-reported">
            <p className="mb-3 text-sm text-ink/75">
              Both bar sets sum to {k.valid}. {sources.disagreements} of {sources.knownObserved} tracked registrations disagree with what the student
              reported.
            </p>
            <ChartFigure
              title="Registrations by source, observed versus self-reported"
              summary={sourceRows.map((r) => `${r.label}: ${r.observed} observed, ${r.selfReported} self-reported`).join('; ')}
              table={
                <DataTable caption="Registrations by source" headers={['Source', 'Observed', 'Self-reported']} rows={sourceRows.map((r) => [r.label, r.observed, r.selfReported])} />
              }
            >
              <GroupedBarChart
                data={sourceRows}
                series={[
                  { key: 'observed', name: 'Observed (link)' },
                  { key: 'selfReported', name: 'Self-reported (form)' },
                ]}
              />
            </ChartFigure>
          </Card>

          <Card title="Registrations by college">
            <ChartFigure
              title="Valid registrations by college"
              summary={collegeRows.map((c) => `${c.label}: ${c.count}`).join('; ')}
              table={<DataTable caption="Registrations by college" headers={['College', 'Valid']} rows={collegeRows.map((c) => [c.label, c.count])} />}
            >
              <GroupedBarChart data={collegeRows} series={[{ key: 'count', name: 'Valid registrations' }]} labelWidth={236} />
            </ChartFigure>
          </Card>

          <Card
            title="Top referral codes"
            actions={
              <Link to="/admin/referrals" className="text-sm font-medium text-brand-800 underline">
                All codes
              </Link>
            }
            className="lg:col-span-2"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Top referral codes by valid registrations</caption>
                <thead className="text-ink/75">
                  <tr>
                    <th scope="col" className="py-1.5 font-medium">Code</th>
                    <th scope="col" className="py-1.5 font-medium">Owner</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Valid</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Unverified opens</th>
                    <th scope="col" className="py-1.5 text-right font-medium">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {topCodes.map((c) => (
                    <tr key={c.id}>
                      <td className="py-1.5 font-mono text-ink">{c.code}</td>
                      <td className="py-1.5 text-ink/85">{c.ownerLabel}</td>
                      <td className="py-1.5 text-right tabular-nums">{c.valid}</td>
                      <td className="py-1.5 text-right tabular-nums">{c.opens}</td>
                      <td className="py-1.5 text-right tabular-nums">{formatPercent(c.conversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <div className="mt-4">
        <DecisionView d={day3Decision(data, now)} />
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const state = useMetricsData();
  return (
    <>
      <PageHeader title="Campaign dashboard" description="Every number is computed from stored rows in this browser. Demo data." />
      <DataView state={state}>{(data) => <DashboardBody data={data} />}</DataView>
    </>
  );
}
