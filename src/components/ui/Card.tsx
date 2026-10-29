import { BadgeCheck, CircleDashed, Flag, Pin } from 'lucide-react';
import type { ReactNode } from 'react';

/** A sheet of paper on the wall. Titles are set like a typed notice heading. */
export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`sheet p-4 sm:p-5 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-2">
          {title && <h2 className="text-lg font-extrabold [font-stretch:75%] text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-4xl text-ink sm:text-5xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[15px] text-ink/75">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A typed slip. `lead` puts it on lemon paper for the one number that matters most. */
export function Kpi({ label, value, sub, lead = false }: { label: string; value: ReactNode; sub?: ReactNode; lead?: boolean }) {
  return (
    <div className={`sheet p-4 ${lead ? '!bg-lemon' : ''}`}>
      <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink/75">{label}</p>
      <p className="display mt-2 text-5xl tabular-nums text-ink">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink/75">{sub}</p>}
    </div>
  );
}

// The four marks every status in the app uses: posted, verified, flagged, torn.
const MARKS = {
  posted: { cls: 'border-solid border-ink/70 text-ink', Icon: Pin },
  verified: { cls: 'border-solid border-stamp text-stamp', Icon: BadgeCheck },
  flagged: { cls: 'border-solid border-ink/70 bg-pink text-ink', Icon: Flag },
  torn: { cls: 'border-dashed border-ink/50 text-ink/75', Icon: CircleDashed },
} as const;
export type Mark = keyof typeof MARKS;

const TONE_TO_MARK = { gray: 'torn', green: 'verified', amber: 'flagged', red: 'flagged', blue: 'posted', indigo: 'posted' } as const;

export function Badge({ tone = 'blue', mark, children }: { tone?: keyof typeof TONE_TO_MARK; mark?: Mark; children: ReactNode }) {
  const { cls, Icon } = MARKS[mark ?? TONE_TO_MARK[tone]];
  return (
    <span className={`inline-flex items-center gap-1 rounded-[2px] border-[1.5px] px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide ${cls}`}>
      <Icon aria-hidden className="h-3 w-3" />
      {children}
    </span>
  );
}
