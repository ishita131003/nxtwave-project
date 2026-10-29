import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { dataSource } from '../../api';
import type { AuditRecord } from '../../lib/schema';
import { Button } from '../../components/ui/Button';
import { Badge, Card, PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataView, EmptyState, Notice } from '../../components/ui/Feedback';
import { SelectField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useSession } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { downloadText, toCsv } from '../../lib/csv';
import { formatDateTime } from '../../lib/dates';
import { REGISTRATION_STATUS_TONE } from '../../lib/labels';
import { enrich, type EnrichedRegistration, type MetricsData } from '../../lib/metrics';
import { OBSERVED_CHANNELS, RegistrationStatus, SOURCE_LABELS, YEAR_LABELS } from '../../lib/schema';

const PAGE_SIZE = 10;
type SortKey = 'newest' | 'oldest' | 'name' | 'college';

const REF_LABEL = { none: '—', valid: 'Valid', invalid_ref: 'Invalid code', rejected_self: 'Self-referral' } as const;

function Detail({ row, audit, onClose }: { row: EnrichedRegistration; audit: AuditRecord[]; onClose: () => void }) {
  const session = useSession();
  const [status, setStatus] = useState(row.status);
  const [note, setNote] = useState('');
  const { pending, error, run } = useAsyncAction();
  const history = audit.filter((a) => a.target_id === row.id);
  const fields: [string, string][] = [
    ['Email', row.email],
    ['College', row.college],
    ['Branch · year', `${row.branch} · ${YEAR_LABELS[row.year]}`],
    ['City / state', [row.city, row.state].filter(Boolean).join(', ') || '—'],
    ['Registered', formatDateTime(row.created_at)],
    ['Self-reported source', SOURCE_LABELS[row.self_reported_source]],
    ['Observed channel', SOURCE_LABELS[row.observedChannel]],
    ['Raw UTM', [row.observed.utm_source, row.observed.utm_medium, row.observed.utm_campaign].filter(Boolean).join(' / ') || '—'],
    ['Referral code', row.ref_code_entered ? `${row.ref_code_entered} (${REF_LABEL[row.ref_status]})` : '—'],
    ['Consent', row.consent ? 'Yes' : 'No'],
  ];

  return (
    <Card
      title={`${row.name}${row.fictional ? ' (fictional)' : ''}`}
      actions={
        <button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-[3px] hover:bg-wall" aria-label="Close details">
          <X aria-hidden className="h-4 w-4" />
        </button>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Badge tone={REGISTRATION_STATUS_TONE[row.status]}>{row.status}</Badge>
        {row.duplicateReasons.map((r) => (
          <Badge key={r} tone="amber">
            Suspected duplicate: {r === 'alias' ? 'email alias' : 'disposable domain'}
          </Badge>
        ))}
        {row.disagrees && <Badge tone="gray">Sources disagree</Badge>}
        {row.deletion_requested && <Badge tone="red">Deletion requested</Badge>}
      </div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {fields.map(([k, v]) => (
          <div key={k}>
            <dt className="text-ink/75">{k}</dt>
            <dd className="break-words text-ink">{v}</dd>
          </div>
        ))}
      </dl>

      <form
        className="mt-5 space-y-3 border-t border-ink/10 pt-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await run(async () => {
            await dataSource.updateRegistrationStatus(session, row.id, status, note || undefined);
            return true;
          });
          if (ok) setNote('');
        }}
      >
        <h3 className="text-sm font-semibold text-ink">Change status</h3>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={RegistrationStatus.options.map((s) => ({ value: s, label: s }))} />
          <TextField label="Note for the audit log" optional maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button type="submit" disabled={pending || status === row.status}>
          Save status
        </Button>
        <p className="text-xs text-ink/75">"Rejected" removes it from valid registrations. Every change is written to the audit log.</p>
      </form>

      <div className="mt-5 border-t border-ink/10 pt-4">
        <h3 className="text-sm font-semibold text-ink">Audit history</h3>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-ink/75">No changes yet.</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-ink/85">
            {history.map((a) => (
              <li key={a.id}>
                <span className="tabular-nums text-ink/75">{formatDateTime(a.ts)}</span> · {a.from} → {a.to}
                {a.note && <> · “{a.note}”</>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function RegistrationsBody({ data, audit }: { data: MetricsData; audit: AuditRecord[] }) {
  const rows = useMemo(() => enrich(data), [data]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [flag, setFlag] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmExport, setConfirmExport] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => !needle || [r.name, r.email, r.college].some((v) => v.toLowerCase().includes(needle)))
      .filter((r) => !status || r.status === status)
      .filter((r) => !source || r.observedChannel === source)
      .filter((r) => !flag || (flag === 'duplicate' ? r.duplicateReasons.length > 0 : flag === 'deletion' ? r.deletion_requested : r.disagrees))
      .sort((a, b) =>
        sort === 'newest'
          ? b.created_at.localeCompare(a.created_at)
          : sort === 'oldest'
            ? a.created_at.localeCompare(b.created_at)
            : sort === 'name'
              ? a.name.localeCompare(b.name)
              : a.college.localeCompare(b.college),
      );
  }, [rows, q, status, source, flag, sort]);

  const pages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);
  const selected = rows.find((r) => r.id === selectedId);
  const reset = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  function exportCsv() {
    const csv = toCsv(
      filtered.map((r) => ({
        ...r,
        observed_channel: r.observedChannel,
        suspected_duplicate: r.duplicateReasons.join('|'),
        utm_source: r.observed.utm_source,
        utm_medium: r.observed.utm_medium,
        utm_campaign: r.observed.utm_campaign,
      })),
      [
        { key: 'created_at', header: 'registered_at' },
        { key: 'name', header: 'name' },
        { key: 'email', header: 'email' },
        { key: 'college', header: 'college' },
        { key: 'branch', header: 'branch' },
        { key: 'year', header: 'year' },
        { key: 'city', header: 'city' },
        { key: 'state', header: 'state' },
        { key: 'status', header: 'status' },
        { key: 'self_reported_source', header: 'self_reported_source' },
        { key: 'observed_channel', header: 'observed_channel' },
        { key: 'utm_source', header: 'utm_source' },
        { key: 'utm_medium', header: 'utm_medium' },
        { key: 'utm_campaign', header: 'utm_campaign' },
        { key: 'ref_code_entered', header: 'referral_code' },
        { key: 'ref_status', header: 'referral_status' },
        { key: 'suspected_duplicate', header: 'suspected_duplicate' },
        { key: 'fictional', header: 'fictional' },
      ],
    );
    downloadText(`registrations-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    setConfirmExport(false);
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end gap-3 sheet p-3">
        <div className="min-w-[12rem] flex-1">
          <TextField label="Search name, email or college" type="search" value={q} onChange={(e) => reset(setQ)(e.target.value)} />
        </div>
        <div className="w-[9rem]">
          <SelectField label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} placeholder="Any" options={RegistrationStatus.options.map((s) => ({ value: s, label: s }))} />
        </div>
        <div className="w-[11rem]">
          <SelectField label="Observed source" value={source} onChange={(e) => reset(setSource)(e.target.value)} placeholder="Any" options={OBSERVED_CHANNELS.map((c) => ({ value: c, label: SOURCE_LABELS[c] }))} />
        </div>
        <div className="w-[12rem]">
          <SelectField
            label="Flag"
            value={flag}
            onChange={(e) => reset(setFlag)(e.target.value)}
            placeholder="Any"
            options={[
              { value: 'duplicate', label: 'Suspected duplicate' },
              { value: 'disagree', label: 'Sources disagree' },
              { value: 'deletion', label: 'Deletion requested' },
            ]}
          />
        </div>
        <div className="w-[9rem]">
          <SelectField
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            options={[
              { value: 'newest', label: 'Newest first' },
              { value: 'oldest', label: 'Oldest first' },
              { value: 'name', label: 'Name' },
              { value: 'college', label: 'College' },
            ]}
          />
        </div>
        <Button variant="secondary" onClick={() => setConfirmExport(true)} disabled={filtered.length === 0}>
          <Download aria-hidden className="h-4 w-4" /> Export CSV ({filtered.length})
        </Button>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1fr_24rem]">
        <Card>
          {filtered.length === 0 ? (
            <EmptyState title="No registrations match">Try a different search or clear the filters.</EmptyState>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] text-left text-sm">
                  <caption className="sr-only">Registrations, page {current + 1} of {pages}</caption>
                  <thead className="text-ink/75">
                    <tr>
                      <th scope="col" className="py-2 pr-3 font-medium">Name</th>
                      <th scope="col" className="py-2 pr-3 font-medium">College</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Registered</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Observed</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {visible.map((r) => (
                      <tr key={r.id} className={selectedId === r.id ? 'bg-brand-50' : undefined}>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            className="text-left font-medium text-brand-800 underline"
                            onClick={() => {
                              setSelectedId(r.id);
                              requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
                            }}
                          >
                            {r.name}
                          </button>
                          <span className="block text-xs text-ink/75">{r.email}</span>
                        </td>
                        <td className="py-2 pr-3 text-ink/85">{r.college.replace(' (fictional)', '')}</td>
                        <td className="py-2 pr-3 tabular-nums text-ink/85">{formatDateTime(r.created_at)}</td>
                        <td className="py-2 pr-3 text-ink/85">{SOURCE_LABELS[r.observedChannel]}</td>
                        <td className="py-2 pr-3">
                          <div className="flex flex-wrap gap-1">
                            <Badge tone={REGISTRATION_STATUS_TONE[r.status]}>{r.status}</Badge>
                            {r.duplicateReasons.length > 0 && <Badge tone="amber">dup?</Badge>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 text-sm text-ink/75">
                <span>
                  {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" aria-label="Previous page" disabled={current === 0} onClick={() => setPage(current - 1)}>
                    <ChevronLeft aria-hidden className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" aria-label="Next page" disabled={current >= pages - 1} onClick={() => setPage(current + 1)}>
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
        {selected ? (
          <div ref={detailRef} className="order-first scroll-mt-12 2xl:order-none">
            <Detail key={selected.id + selected.status} row={selected} audit={audit} onClose={() => setSelectedId(null)} />
          </div>
        ) : (
          <div className="hidden 2xl:block">
            <EmptyState title="Select a registration">Details, flags, status changes and audit history appear here.</EmptyState>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmExport} title="Export personal data?" confirmLabel="Download CSV" onCancel={() => setConfirmExport(false)} onConfirm={exportCsv}>
        <p>
          This file contains names, emails and colleges for {filtered.length} registration{filtered.length === 1 ? '' : 's'}. Store it securely, share it
          only with people who need it, and delete it when you're done. Cells that start with = + - @ are prefixed with ' so spreadsheet apps don't run
          them as formulas.
        </p>
      </ConfirmDialog>
    </>
  );
}

export default function AdminRegistrations() {
  const session = useSession();
  const state = useData(
    async () => ({ data: await dataSource.getMetricsData(session), audit: await dataSource.listAuditLog(session) }),
    [session.token],
  );
  return (
    <>
      <PageHeader title="Registrations" description="Suspected duplicates are flagged, not removed. Reject a registration to exclude it from valid counts." />
      <DataView state={state}>{({ data, audit }) => <RegistrationsBody data={data} audit={audit} />}</DataView>
    </>
  );
}
