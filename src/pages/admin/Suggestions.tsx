import { useMemo, useState } from 'react';
import { dataSource } from '../../api';
import type { AdminSuggestion } from '../../api/dataSource';
import { Button } from '../../components/ui/Button';
import { Badge, PageHeader } from '../../components/ui/Card';
import { DataView, EmptyState, Notice } from '../../components/ui/Feedback';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { formatDateTime } from '../../lib/dates';
import { SUGGESTION_STATUS_TONE } from '../../lib/labels';
import { CONTACT_LABELS, SUGGESTION_CATEGORIES, SUGGESTION_CATEGORY_LABELS, SuggestionStatus } from '../../lib/schema';

function SuggestionItem({ s }: { s: AdminSuggestion }) {
  const session = useSession();
  const [status, setStatus] = useState(s.status);
  const [response, setResponse] = useState(s.admin_response ?? '');
  const { pending, error, run } = useAsyncAction();
  const [saved, setSaved] = useState(false);

  return (
    <li className="sheet p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-ink">{s.idea}</p>
          <p className="mt-0.5 text-xs text-ink/75">
            {s.studentName}
            {s.fictional && ' (fictional)'} · {SUGGESTION_CATEGORY_LABELS[s.category]} · {formatDateTime(s.created_at)} · {CONTACT_LABELS[s.contact_preference]}
          </p>
        </div>
        <Badge tone={SUGGESTION_STATUS_TONE[s.status]}>{s.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-ink/85">{s.description}</p>
      <form
        className="mt-3 grid gap-3 border-t border-ink/10 pt-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaved(false);
          const ok = await run(async () => {
            await dataSource.respondToSuggestion(session, s.id, status, response);
            return true;
          });
          if (ok) setSaved(true);
        }}
      >
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={SuggestionStatus.options.map((o) => ({ value: o, label: o }))} />
        <TextAreaField label="Response (visible to the student)" rows={2} maxLength={1000} value={response} onChange={(e) => setResponse(e.target.value)} />
        <Button type="submit" variant="secondary" disabled={pending}>
          Save
        </Button>
      </form>
      {error && (
        <div className="mt-2">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {saved && (
        <p role="status" className="mt-2 text-sm text-ink">
          Saved.
        </p>
      )}
    </li>
  );
}

export default function AdminSuggestions() {
  const session = useSession();
  const state = useData(() => dataSource.listAllSuggestions(session), [session.token]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');

  return (
    <>
      <PageHeader title="Suggestions inbox" />
      <div className="mb-4 flex flex-wrap items-end gap-3 sheet p-3">
        <div className="min-w-[12rem] flex-1">
          <TextField label="Search" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-[10rem]">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="Any" options={SuggestionStatus.options.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="w-[12rem]">
          <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Any" options={SUGGESTION_CATEGORIES.map((c) => ({ value: c, label: SUGGESTION_CATEGORY_LABELS[c] }))} />
        </div>
      </div>
      <DataView state={state}>
        {(items) => <Inbox items={items} q={q} status={status} category={category} />}
      </DataView>
    </>
  );
}

function Inbox({ items, q, status, category }: { items: AdminSuggestion[]; q: string; status: string; category: string }) {
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter(
      (s) =>
        (!needle || [s.idea, s.description, s.studentName].some((v) => v.toLowerCase().includes(needle))) &&
        (!status || s.status === status) &&
        (!category || s.category === category),
    );
  }, [items, q, status, category]);

  if (filtered.length === 0) return <EmptyState title="No suggestions match" />;
  return (
    <section aria-labelledby="inbox-count">
      <h2 id="inbox-count" className="mb-3 text-sm font-semibold text-ink/85">
        {filtered.length} suggestion{filtered.length === 1 ? '' : 's'}
      </h2>
      <ul className="space-y-3">
        {filtered.map((s) => (
          <SuggestionItem key={s.id + s.updated_at} s={s} />
        ))}
      </ul>
    </section>
  );
}
