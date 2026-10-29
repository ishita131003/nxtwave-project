import { AlertTriangle, CheckCircle2, Info, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '../../api/errors';

type Tone = 'info' | 'success' | 'warning' | 'error';

// Slips of paper: white for information, lemon for good news, pink for a caution, a stamped edge for errors.
const TONES: Record<Tone, { cls: string; Icon: typeof Info }> = {
  info: { cls: 'bg-white ring-[1.5px] ring-ink/20', Icon: Info },
  success: { cls: 'bg-lemon', Icon: CheckCircle2 },
  warning: { cls: 'bg-pink', Icon: AlertTriangle },
  error: { cls: 'bg-white ring-2 ring-stamp', Icon: AlertTriangle },
};

export function Notice({ tone = 'info', title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  const { cls, Icon } = TONES[tone];
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-3 rounded-[2px] p-3 text-sm text-ink ${cls}`}>
      <Icon aria-hidden className={`mt-0.5 h-4 w-4 shrink-0 ${tone === 'error' ? 'text-stamp' : ''}`} />
      <div>
        {title && <p className="font-bold">{title}</p>}
        {children}
      </div>
    </div>
  );
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 font-mono text-sm text-ink/75">
      <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <Notice tone="error" title="Couldn't load this">
      <p>{errorMessage(error)}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 font-bold underline">
          Try again
        </button>
      )}
    </Notice>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[2px] border-2 border-dashed border-ink/30 p-6 text-center text-sm text-ink/75">
      <p className="font-bold text-ink">{title}</p>
      {children}
    </div>
  );
}

/** Renders loading / error / empty / content for a useData result. */
export function DataView<T>({
  state,
  isEmpty,
  empty,
  children,
}: {
  state: { data: T | undefined; error: unknown; loading: boolean; reload: () => void };
  isEmpty?: (d: T) => boolean;
  empty?: ReactNode;
  children: (data: T) => ReactNode;
}) {
  if (state.loading && state.data === undefined) return <Loading />;
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.data === undefined) return <Loading />;
  if (isEmpty?.(state.data)) return <>{empty}</>;
  return <>{children(state.data)}</>;
}
