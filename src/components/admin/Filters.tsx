import { RotateCcw } from 'lucide-react';
import { SelectField, TextField } from '../ui/Field';
import { OBSERVED_CHANNELS, SOURCE_LABELS, type CampaignSettings, type ObservedChannel } from '../../lib/schema';
import type { Filters } from '../../lib/metrics';

export function FilterBar({
  value,
  onChange,
  settings,
  colleges,
  branches,
  show = ['date', 'source', 'college', 'branch'],
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  settings: CampaignSettings;
  colleges?: string[];
  branches?: string[];
  show?: ('date' | 'source' | 'college' | 'branch')[];
}) {
  const active = Object.values(value).some(Boolean);
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 sheet p-3">
      {show.includes('date') && (
        <>
          <div className="w-[9.5rem]">
            <TextField label="From" type="date" min={settings.start_date} max={settings.end_date} value={value.from ?? ''} onChange={(e) => onChange({ ...value, from: e.target.value || undefined })} />
          </div>
          <div className="w-[9.5rem]">
            <TextField label="To" type="date" min={settings.start_date} max={settings.end_date} value={value.to ?? ''} onChange={(e) => onChange({ ...value, to: e.target.value || undefined })} />
          </div>
        </>
      )}
      {show.includes('source') && (
        <div className="w-[11rem]">
          <SelectField
            label="Observed source"
            value={value.source ?? ''}
            onChange={(e) => onChange({ ...value, source: (e.target.value || undefined) as ObservedChannel | undefined })}
            placeholder="All sources"
            options={OBSERVED_CHANNELS.map((c) => ({ value: c, label: SOURCE_LABELS[c] }))}
          />
        </div>
      )}
      {show.includes('college') && colleges && (
        <div className="w-[13rem]">
          <SelectField label="College" value={value.college ?? ''} onChange={(e) => onChange({ ...value, college: e.target.value || undefined })} placeholder="All colleges" options={colleges.map((c) => ({ value: c, label: c }))} />
        </div>
      )}
      {show.includes('branch') && branches && (
        <div className="w-[9rem]">
          <SelectField label="Branch" value={value.branch ?? ''} onChange={(e) => onChange({ ...value, branch: e.target.value || undefined })} placeholder="All branches" options={branches.map((b) => ({ value: b, label: b }))} />
        </div>
      )}
      {active && (
        <button type="button" onClick={() => onChange({})} className="flex min-h-11 items-center gap-1.5 rounded-[3px] px-3 text-sm font-medium text-brand-800 hover:bg-brand-50">
          <RotateCcw aria-hidden className="h-4 w-4" /> Clear filters
        </button>
      )}
    </div>
  );
}

export const uniqueSorted = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
