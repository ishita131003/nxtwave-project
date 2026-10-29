import { useState, type FormEvent } from 'react';
import { dataSource } from '../../api';
import { MAX_SUGGESTIONS_PER_DAY } from '../../api/localStore';
import { Button } from '../../components/ui/Button';
import { Badge, Card, PageHeader } from '../../components/ui/Card';
import { DataView, EmptyState, Notice } from '../../components/ui/Feedback';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { formatDateTime } from '../../lib/dates';
import { CONTACT_LABELS, SUGGESTION_CATEGORIES, SUGGESTION_CATEGORY_LABELS, type SuggestionInput } from '../../lib/schema';
import { SUGGESTION_STATUS_TONE } from '../../lib/labels';

const EMPTY = { idea: '', category: 'campaign_idea', description: '', contact_preference: 'in_app' } as const;

export default function Suggestions() {
  const session = useSession();
  const list = useData(() => dataSource.listMySuggestions(session), [session.token]);
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [form, setForm] = useState<SuggestionInput>({ ...EMPTY });
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSent(false);
    const ok = await run(async () => {
      await dataSource.createSuggestion(session, form);
      return true;
    });
    if (ok) {
      setForm({ ...EMPTY });
      setSent(true);
    }
  }

  return (
    <>
      <PageHeader title="Suggestions" description={`Ideas for the campaign or the workshop. Up to ${MAX_SUGGESTIONS_PER_DAY} a day.`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Send a suggestion">
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            {error && <Notice tone="error">{error}</Notice>}
            {sent && <Notice tone="success">Thanks! The team will see it in their inbox.</Notice>}
            <TextField
              label="Your idea"
              maxLength={100}
              value={form.idea}
              onChange={(e) => setForm({ ...form, idea: e.target.value })}
              error={fieldErrors.idea}
              hint={`${form.idea.length}/100`}
            />
            <SelectField
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as SuggestionInput['category'] })}
              options={SUGGESTION_CATEGORIES.map((c) => ({ value: c, label: SUGGESTION_CATEGORY_LABELS[c] }))}
            />
            <TextAreaField
              label="Details"
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={fieldErrors.description}
              hint={`${form.description.length}/1000`}
            />
            <SelectField
              label="How should we follow up?"
              value={form.contact_preference}
              onChange={(e) => setForm({ ...form, contact_preference: e.target.value as SuggestionInput['contact_preference'] })}
              options={Object.entries(CONTACT_LABELS).map(([value, label]) => ({ value, label }))}
            />
            <Button type="submit" disabled={pending}>
              {pending ? 'Sending…' : 'Send suggestion'}
            </Button>
          </form>
        </Card>
        <Card title="Your suggestions">
          <DataView state={list} isEmpty={(d) => d.length === 0} empty={<EmptyState title="Nothing sent yet" />}>
            {(items) => (
              <ul className="space-y-3">
                {items.map((s) => (
                  <li key={s.id} className="rounded-[3px] p-3 ring-1 ring-ink/15">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-ink">{s.idea}</p>
                      <Badge tone={SUGGESTION_STATUS_TONE[s.status]}>{s.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ink/75">
                      {SUGGESTION_CATEGORY_LABELS[s.category]} · {formatDateTime(s.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-ink/85">{s.description}</p>
                    {s.admin_response && (
                      <div className="mt-3 rounded-[2px] bg-brand-50 p-3 text-sm text-brand-950">
                        <p className="font-semibold">Response from the team</p>
                        <p className="mt-1">{s.admin_response}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </DataView>
        </Card>
      </div>
    </>
  );
}
