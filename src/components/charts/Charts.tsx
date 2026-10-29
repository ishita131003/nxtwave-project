// Recharts wrappers following the dataviz method: thin marks, recessive grid, one axis, legend for
// two series, tooltip on hover, and a table view for every chart. Colors are the reference palette.
import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const SERIES_1 = '#1e4a85';
const SERIES_2 = '#0f8b8d';
const TARGET = '#0f1d33';
const GRID = '#d5dde9';
const AXIS = { fontSize: 11, fill: '#41506a', fontFamily: 'Courier Prime, monospace' };
const TOOLTIP = { contentStyle: { borderRadius: 2, border: '1.5px solid #0f1d33', fontSize: 13, background: '#ffffff' }, cursor: { fill: 'rgb(30 74 133 / 0.08)' } };

export function ChartFigure({ title, summary, table, children }: { title: string; summary: string; table: ReactNode; children: ReactNode }) {
  return (
    <figure className="m-0">
      <figcaption className="sr-only">
        {title}. {summary}
      </figcaption>
      <div role="img" aria-label={`${title}. ${summary}`}>
        {children}
      </div>
      <details className="mt-2 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-xs font-bold tracking-wide text-felt">SHOW AS TABLE</summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </figure>
  );
}

export function DataTable({ caption, headers, rows }: { caption: string; headers: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="font-mono text-xs uppercase text-ink/75">
        <tr>
          {headers.map((h, i) => (
            <th key={h} scope="col" className={`py-1.5 pr-3 font-medium ${i > 0 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/10">
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`py-1.5 pr-3 ${j > 0 ? 'text-right tabular-nums' : 'text-ink'}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function DailyLineChart({ data }: { data: { label: string; valid: number; target: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...TOOLTIP} cursor={{ stroke: '#94a3b8', strokeWidth: 1 }} />
        <Legend wrapperStyle={{ fontSize: 13 }} />
        <Line isAnimationActive={false} name="Valid registrations" type="monotone" dataKey="valid" stroke={SERIES_1} strokeWidth={2} dot={{ r: 4, fill: SERIES_1, stroke: '#ffffff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
        <Line isAnimationActive={false} name="Daily target" type="monotone" dataKey="target" stroke={TARGET} strokeWidth={2} strokeDasharray="6 4" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GroupedBarChart({
  data,
  series,
  labelWidth = 128,
}: {
  data: Record<string, string | number>[];
  series: { key: string; name: string }[];
  labelWidth?: number;
}) {
  const colors = [SERIES_1, SERIES_2];
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 44, 160)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid stroke={GRID} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="label" tick={AXIS} tickLine={false} axisLine={false} width={labelWidth} />
        <Tooltip {...TOOLTIP} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 13 }} />}
        {series.map((s, i) => (
          <Bar isAnimationActive={false} key={s.key} name={s.name} dataKey={s.key} fill={colors[i]} radius={[0, 2, 2, 0]} stroke="#ffffff" strokeWidth={2} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
