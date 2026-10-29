import { Compass } from 'lucide-react';
import { Badge, Card } from '../ui/Card';
import { formatDay } from '../../lib/dates';
import { formatPercent, LOW_SAMPLE_OPENS, type Day3Decision } from '../../lib/metrics';
import { SOURCE_LABELS } from '../../lib/schema';

const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();

export function DecisionView({ d }: { d: Day3Decision }) {
  const gap = d.requiredPace !== null ? d.requiredPace - d.currentPace : null;
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <Compass aria-hidden className="h-4 w-4 text-felt" /> Day-3 decision: where to double down
        </span>
      }
    >
      <p className="text-sm text-ink/75">
        Uses campaign days 1–{d.daysCovered} (to {formatDay(d.checkpointDay)}): {d.valid} valid registrations. Rule: the channel and code with the
        most valid registrations; code ties go to higher conversion.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="bg-lemon p-4 text-ink">
          <p className="font-mono text-xs font-bold tracking-wide">DOUBLE DOWN ON CHANNEL</p>
          <p className="display mt-2 text-4xl">{d.topChannel ? SOURCE_LABELS[d.topChannel] : 'Not enough data yet'}</p>
          {d.topChannel && (
            <p className="mt-1 text-sm">
              {d.channels[0].valid} of {d.valid} early registrations ({formatPercent(d.channels[0].share, 0)}).
            </p>
          )}
        </div>
        <div className="bg-white p-4 text-ink ring-[1.5px] ring-ink">
          <p className="font-mono text-xs font-bold tracking-wide">TOP CODE</p>
          <p className="mt-2 font-mono text-3xl font-bold">{d.topCode?.code ?? 'Not enough data yet'}</p>
          {d.topCode && (
            <p className="mt-1 text-sm">
              {d.topCode.valid} valid ÷ {d.topCode.opens} unverified opens = {formatPercent(d.topCode.conversion)}
              {d.topCode.lowSample && ` · low sample (< ${LOW_SAMPLE_OPENS} opens)`}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-[3px] p-4 ring-1 ring-ink/15">
        <p className="text-sm text-ink/85">
          Pace so far: <strong className="tabular-nums">{fmt1(d.currentPace)}/day</strong> ({d.totalValid} valid).{' '}
          {d.requiredPace !== null ? (
            <>
              To reach the target in the {d.daysRemaining} remaining day{d.daysRemaining === 1 ? '' : 's'} (including today) you need{' '}
              <strong className="tabular-nums">{fmt1(d.requiredPace)}/day</strong>
              {gap !== null && gap > 0 && <> — {fmt1(gap)}/day more than now</>}.
            </>
          ) : (
            'The campaign window has ended.'
          )}
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="mb-1 text-left text-sm font-semibold text-ink">Channels, days 1–{d.daysCovered}</caption>
            <thead className="text-ink/75">
              <tr>
                <th scope="col" className="py-1.5 font-medium">Observed channel</th>
                <th scope="col" className="py-1.5 text-right font-medium">Valid</th>
                <th scope="col" className="py-1.5 text-right font-medium">Per day</th>
                <th scope="col" className="py-1.5 text-right font-medium">Needed/day</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {d.channels.map((c) => (
                <tr key={c.channel}>
                  <td className="py-1.5 text-ink">{SOURCE_LABELS[c.channel]}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.valid}</td>
                  <td className="py-1.5 text-right tabular-nums">{fmt1(c.actualPerDay)}</td>
                  <td className="py-1.5 text-right tabular-nums text-ink/75">{c.requiredPerDay === null ? '—' : fmt1(c.requiredPerDay)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="mb-1 text-left text-sm font-semibold text-ink">Codes, days 1–{d.daysCovered}</caption>
            <thead className="text-ink/75">
              <tr>
                <th scope="col" className="py-1.5 font-medium">Code</th>
                <th scope="col" className="py-1.5 text-right font-medium">Valid</th>
                <th scope="col" className="py-1.5 text-right font-medium">Opens</th>
                <th scope="col" className="py-1.5 text-right font-medium">Conv.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {d.codes.map((c) => (
                <tr key={c.id}>
                  <td className="py-1.5 font-mono text-ink">
                    {c.code} {c.lowSample && <Badge tone="amber">low sample</Badge>}
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{c.valid}</td>
                  <td className="py-1.5 text-right tabular-nums">{c.opens}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatPercent(c.conversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink/75">
        "Needed/day" is the channel's share of the target from the measurement plan spread over the campaign. Opens are unverified link opens
        (distinct sessions).
      </p>
    </Card>
  );
}
