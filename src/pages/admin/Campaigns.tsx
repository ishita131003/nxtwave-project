import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { dataSource } from '../../api';
import { Button } from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { DataView, Notice } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Field';
import { useMetricsData } from '../../hooks/useAdmin';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSession } from '../../hooks/useAuth';
import { dayRange, formatDay, istDay } from '../../lib/dates';
import { budgetSummary, validRows, type MetricsData } from '../../lib/metrics';
import { BUDGET_LABELS, BudgetCategory, SELF_REPORTED_SOURCES, SOURCE_LABELS, type CampaignSettings } from '../../lib/schema';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function SettingsForm({ settings }: { settings: CampaignSettings }) {
  const session = useSession();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: settings.name,
    target: String(settings.target),
    start_date: settings.start_date,
    end_date: settings.end_date,
    daily_targets: settings.daily_targets.map(String),
    sources: settings.sources,
    planned_budget: settings.planned_budget.map((b) => ({ ...b, amount: String(b.amount) })),
    whatsapp_url: settings.whatsapp_url ?? '',
  });
  const days = form.start_date && form.end_date && form.end_date >= form.start_date ? dayRange(form.start_date, form.end_date) : [];
  const targets = days.map((_, i) => form.daily_targets[i] ?? '0');
  const sum = targets.reduce((s, t) => s + (Number(t) || 0), 0);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    const ok = await run(async () => {
      await dataSource.updateCampaignSettings(session, {
        name: form.name,
        target: Number(form.target),
        start_date: form.start_date,
        end_date: form.end_date,
        daily_targets: targets.map(Number),
        sources: form.sources,
        planned_budget: form.planned_budget.map((b) => ({ category: b.category, amount: Number(b.amount) })),
        whatsapp_url: form.whatsapp_url,
      });
      return true;
    });
    if (ok) setSaved(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {saved && <Notice tone="success">Campaign settings saved. Dashboards update immediately.</Notice>}
      <Card title="Campaign">
        <div className="space-y-4">
          <TextField label="Campaign name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={fieldErrors.name} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField label="Target (valid registrations)" type="number" inputMode="numeric" min={1} value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} error={fieldErrors.target} />
            <TextField label="Start date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} error={fieldErrors.start_date} />
            <TextField label="End date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} error={fieldErrors.end_date} />
          </div>
          <TextField
            label="WhatsApp community link"
            optional
            type="url"
            placeholder="https://chat.whatsapp.com/…"
            value={form.whatsapp_url}
            onChange={(e) => setForm({ ...form, whatsapp_url: e.target.value })}
            error={fieldErrors.whatsapp_url}
            hint="Overrides VITE_WHATSAPP_COMMUNITY_URL. Leave empty to show students “Community link coming soon”."
          />
        </div>
      </Card>

      <Card title="Daily target curve">
        <p className="mb-3 text-sm text-ink/75">
          One value per campaign day. Sum: <strong className={sum === Number(form.target) ? 'text-ink' : 'text-red-700'}>{sum}</strong> of{' '}
          {form.target || 0}
          {sum !== Number(form.target) && ' — must equal the target to save'}.
        </p>
        <fieldset>
          <legend className="sr-only">Daily targets</legend>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((d, i) => (
              <TextField
                key={d}
                label={`D${i + 1} · ${formatDay(d)}`}
                type="number"
                inputMode="numeric"
                min={0}
                value={targets[i]}
                onChange={(e) => {
                  const next = [...targets];
                  next[i] = e.target.value;
                  setForm({ ...form, daily_targets: next });
                }}
              />
            ))}
          </div>
        </fieldset>
        {fieldErrors.daily_targets && <p className="mt-2 text-sm text-red-700">{fieldErrors.daily_targets}</p>}
      </Card>

      <Card title="Sources offered on the registration form">
        <fieldset>
          <legend className="sr-only">Self-reported sources</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {SELF_REPORTED_SOURCES.map((s) => (
              <label key={s} className="flex min-h-11 items-center gap-3 text-sm text-ink">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={form.sources.includes(s)}
                  onChange={(e) => setForm({ ...form, sources: e.target.checked ? [...form.sources, s] : form.sources.filter((x) => x !== s) })}
                />
                {SOURCE_LABELS[s]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="mt-2 text-xs text-ink/75">Unchecked sources are hidden from the "How did you hear about this?" dropdown. Existing registrations keep their answer.</p>
      </Card>

      <Card title="Planned budget">
        <div className="grid gap-3 sm:grid-cols-4">
          {form.planned_budget.map((b, i) => (
            <TextField
              key={b.category}
              label={`${BUDGET_LABELS[b.category]} (₹)`}
              type="number"
              inputMode="decimal"
              min={0}
              value={b.amount}
              onChange={(e) => {
                const next = [...form.planned_budget];
                next[i] = { ...b, amount: e.target.value };
                setForm({ ...form, planned_budget: next });
              }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-ink/75">Planned total: {rupees(form.planned_budget.reduce((s, b) => s + (Number(b.amount) || 0), 0))}. Planned money is never counted as spend.</p>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save campaign settings'}
      </Button>
    </form>
  );
}

function Spend({ data }: { data: MetricsData }) {
  const session = useSession();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [form, setForm] = useState({ date: istDay(new Date()), category: 'paid_test', amount: '', note: '' });
  const budget = budgetSummary(data.settings, validRows(data).length);

  return (
    <Card title="Actual spend">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Planned versus actual spend by category</caption>
          <thead className="text-ink/75">
            <tr>
              <th scope="col" className="py-1.5 font-medium">Category</th>
              <th scope="col" className="py-1.5 text-right font-medium">Planned</th>
              <th scope="col" className="py-1.5 text-right font-medium">Actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {budget.byCategory.map((b) => (
              <tr key={b.category}>
                <td className="py-1.5">{BUDGET_LABELS[b.category]}</td>
                <td className="py-1.5 text-right tabular-nums">{rupees(b.planned)}</td>
                <td className="py-1.5 text-right tabular-nums">{rupees(b.actual)}</td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-1.5">Total</td>
              <td className="py-1.5 text-right tabular-nums">{rupees(budget.planned)}</td>
              <td className="py-1.5 text-right tabular-nums">{rupees(budget.actual)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-[3px] bg-wall p-3 text-sm text-ink/85">
        Cost per valid registration:{' '}
        <strong className="tabular-nums">{budget.costPerRegistration === null ? '—' : rupees(Math.round(budget.costPerRegistration * 100) / 100)}</strong>
        {budget.costPerRegistration === null ? ' (shown once actual spend is recorded)' : ' = actual spend ÷ valid registrations'}. Ceiling: ₹4.
      </p>

      {data.settings.actual_spend.length > 0 && (
        <ul className="mt-4 divide-y divide-ink/10 text-sm">
          {data.settings.actual_spend.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="tabular-nums">{formatDay(s.date)}</span> · {BUDGET_LABELS[s.category]} · <strong className="tabular-nums">{rupees(s.amount)}</strong>
                {s.note && <span className="text-ink/75"> · {s.note}</span>}
              </span>
              <Button variant="ghost" aria-label={`Remove ${rupees(s.amount)} spend on ${formatDay(s.date)}`} onClick={() => dataSource.removeSpend(session, s.id)}>
                <Trash2 aria-hidden className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        noValidate
        className="mt-4 space-y-3 border-t border-ink/10 pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(async () => {
            await dataSource.addSpend(session, { date: form.date, category: form.category as BudgetCategory, amount: Number(form.amount), note: form.note || undefined });
            return true;
          });
          if (ok) setForm({ ...form, amount: '', note: '' });
        }}
      >
        <h3 className="text-sm font-semibold text-ink">Record spend</h3>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-3 sm:grid-cols-3">
          <TextField label="Date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} error={fieldErrors.date} />
          <SelectField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={BudgetCategory.options.map((c) => ({ value: c, label: BUDGET_LABELS[c] }))} />
          <TextField label="Amount (₹)" type="number" inputMode="decimal" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} error={fieldErrors.amount} />
        </div>
        <TextField label="Note" optional maxLength={200} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <Button type="submit" variant="secondary" disabled={pending}>
          Add spend
        </Button>
      </form>
    </Card>
  );
}

export default function AdminCampaigns() {
  const state = useMetricsData();
  return (
    <>
      <PageHeader title="Campaign settings" description="Changes are validated and written to the audit log. Roles can't be edited anywhere in the app." />
      <DataView state={state}>
        {(data) => (
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <SettingsForm key={JSON.stringify(data.settings)} settings={data.settings} />
            <Spend data={data} />
          </div>
        )}
      </DataView>
    </>
  );
}
