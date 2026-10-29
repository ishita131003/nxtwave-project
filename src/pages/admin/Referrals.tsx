import { Copy, Trophy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { dataSource } from '../../api';
import { Button } from '../../components/ui/Button';
import { Badge, Card, PageHeader } from '../../components/ui/Card';
import { DataView, Notice } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Field';
import { useMetricsData } from '../../hooks/useAdmin';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSession } from '../../hooks/useAuth';
import { useClipboard } from '../../hooks/useClipboard';
import { codeStats, formatPercent, LOW_SAMPLE_OPENS, type CodeStat } from '../../lib/metrics';
import { ownerUrl } from '../../lib/share';

function CreateCode() {
  const session = useSession();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [form, setForm] = useState({ code: '', owner_type: 'ambassador' as 'ambassador' | 'club', owner_label: '', owner_email: '' });
  const [created, setCreated] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setCreated(null);
    const ok = await run(async () => {
      await dataSource.createReferralCode(session, form);
      return true;
    });
    if (ok) {
      setCreated(form.code.toUpperCase());
      setForm({ code: '', owner_type: form.owner_type, owner_label: '', owner_email: '' });
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {created && <Notice tone="success">Created {created}. Copy its link from the table.</Notice>}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Code" autoCapitalize="characters" placeholder="AMB-COLLEGE" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} error={fieldErrors.code} hint="4–24 letters, numbers or hyphens" />
        <SelectField
          label="Owner type"
          value={form.owner_type}
          onChange={(e) => setForm({ ...form, owner_type: e.target.value as 'ambassador' | 'club' })}
          options={[
            { value: 'ambassador', label: 'Ambassador' },
            { value: 'club', label: 'Club' },
          ]}
        />
      </div>
      <TextField label="Owner name or club" value={form.owner_label} onChange={(e) => setForm({ ...form, owner_label: e.target.value })} error={fieldErrors.owner_label} />
      <TextField
        label="Owner email"
        optional
        type="email"
        value={form.owner_email}
        onChange={(e) => setForm({ ...form, owner_email: e.target.value })}
        error={fieldErrors.owner_email}
        hint="Used to catch self-referrals."
      />
      <Button type="submit" disabled={pending}>
        Create code
      </Button>
    </form>
  );
}

function CodeRow({ c }: { c: CodeStat }) {
  const session = useSession();
  const { status, copy } = useClipboard();
  return (
    <tr>
      <td className="py-2 pr-3 font-mono text-ink">{c.code}</td>
      <td className="py-2 pr-3 text-ink/85">
        {c.ownerLabel} <Badge tone={c.ownerType === 'student' ? 'gray' : 'indigo'}>{c.ownerType}</Badge>
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">{c.opens}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{c.valid}</td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {formatPercent(c.conversion)}
        {c.conversion !== null && c.lowSample && <span className="block text-xs text-ink/75">low sample</span>}
      </td>
      <td className="py-2 pr-3">
        <Badge tone={c.status === 'active' ? 'green' : 'gray'}>{c.status}</Badge>
      </td>
      <td className="py-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" aria-label={`Copy link for ${c.code}`} onClick={() => copy(c.id, ownerUrl(window.location.origin, c.code, c.ownerType))}>
            <Copy aria-hidden className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={() => dataSource.setReferralCodeStatus(session, c.id, c.status === 'active' ? 'paused' : 'active')}>
            {c.status === 'active' ? 'Pause' : 'Resume'}
          </Button>
          {status?.key === c.id && (
            <span role="status" className="text-xs text-ink/75">
              {status.ok ? 'Copied' : 'Copy blocked'}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AdminReferrals() {
  const state = useMetricsData();
  const [showStudents, setShowStudents] = useState(false);
  return (
    <>
      <PageHeader title="Referral codes" description="Opens are unverified: anyone can open a link repeatedly. They're counted as distinct anonymous sessions." />
      <DataView state={state}>
        {(data) => {
          const stats = codeStats(data);
          const leaderboard = stats.filter((c) => c.valid > 0).slice(0, 5);
          const listed = stats.filter((c) => showStudents || c.ownerType !== 'student' || c.opens > 0 || c.valid > 0);
          return (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card
                  title={
                    <span className="flex items-center gap-2">
                      <Trophy aria-hidden className="h-4 w-4 text-brand-700" /> Leaderboard
                    </span>
                  }
                >
                  <ol className="space-y-2">
                    {leaderboard.map((c, i) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="flex items-center gap-3">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">{i + 1}</span>
                          <span>
                            <span className="font-mono font-semibold text-ink">{c.code}</span>
                            <span className="block text-xs text-ink/75">{c.ownerLabel}</span>
                          </span>
                        </span>
                        <span className="tabular-nums font-semibold text-ink">{c.valid} valid</span>
                      </li>
                    ))}
                  </ol>
                </Card>
                <Card title="Create an ambassador or club code">
                  <CreateCode />
                </Card>
              </div>
              <Card
                title="All codes"
                actions={
                  <label className="flex min-h-11 items-center gap-2 text-sm text-ink/85">
                    <input type="checkbox" className="h-5 w-5" checked={showStudents} onChange={(e) => setShowStudents(e.target.checked)} />
                    Include inactive student codes
                  </label>
                }
              >
                <p className="mb-3 rounded-[3px] bg-wall p-3 text-sm text-ink/85">
                  <strong>Conversion</strong> = valid registrations with the code ÷ unverified link opens. Shown as "—" when there are no opens; marked
                  low sample under {LOW_SAMPLE_OPENS} opens.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[46rem] text-left text-sm">
                    <caption className="sr-only">Referral codes with opens, valid registrations and conversion</caption>
                    <thead className="text-ink/75">
                      <tr>
                        <th scope="col" className="py-2 pr-3 font-medium">Code</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Owner</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Unverified opens</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Valid regs</th>
                        <th scope="col" className="py-2 pr-3 text-right font-medium">Conversion</th>
                        <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                        <th scope="col" className="py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/10">
                      {listed.map((c) => (
                        <CodeRow key={c.id} c={c} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        }}
      </DataView>
    </>
  );
}
