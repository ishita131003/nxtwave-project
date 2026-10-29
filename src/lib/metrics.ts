// Every KPI and chart is derived here from raw rows. No stored counters. See docs/measurement.md.
import { aliasKey, suspectedDuplicates, type DuplicateReason } from './email';
import { addDays, dayRange, daysBetween, istDay } from './dates';
import {
  OBSERVED_CHANNELS,
  type CampaignSettings,
  type EventRecord,
  type EventType,
  type ObservedChannel,
  type ReferralCodeRecord,
  type RegistrationRecord,
} from './schema';

export type RegistrationRow = RegistrationRecord & { name: string; email: string };

export interface MetricsData {
  registrations: RegistrationRow[];
  referralCodes: ReferralCodeRecord[];
  events: EventRecord[];
  settings: CampaignSettings;
}

export interface Filters {
  from?: string;
  to?: string;
  source?: ObservedChannel;
  college?: string;
  branch?: string;
}

export interface EnrichedRegistration extends RegistrationRow {
  day: string;
  valid: boolean;
  observedChannel: ObservedChannel;
  duplicateReasons: DuplicateReason[];
  disagrees: boolean;
}

const UTM_CHANNEL: Record<string, ObservedChannel> = {
  whatsapp: 'whatsapp',
  instagram: 'instagram',
  linkedin: 'linkedin',
  facebook: 'facebook',
  ambassador: 'ambassador_club',
  club: 'ambassador_club',
  referral: 'friend',
};

export const LOW_SAMPLE_OPENS = 10;

export function isValidRegistration(r: RegistrationRecord): boolean {
  return r.consent && r.status !== 'rejected';
}

export function observedChannel(r: RegistrationRecord, codesById: Map<string, ReferralCodeRecord>): ObservedChannel {
  if (r.ref_status === 'valid' && r.ref_code_id) {
    const code = codesById.get(r.ref_code_id);
    if (code) return code.owner_type === 'student' ? 'friend' : 'ambassador_club';
  }
  const utm = r.observed.utm_source?.trim().toLowerCase();
  if (utm) return UTM_CHANNEL[utm] ?? 'other';
  return 'direct';
}

export function enrich(data: MetricsData): EnrichedRegistration[] {
  const codesById = new Map(data.referralCodes.map((c) => [c.id, c]));
  const dupes = suspectedDuplicates(data.registrations);
  return data.registrations.map((r) => {
    const channel = observedChannel(r, codesById);
    return {
      ...r,
      day: istDay(r.created_at),
      valid: isValidRegistration(r),
      observedChannel: channel,
      duplicateReasons: dupes.get(r.id) ?? [],
      disagrees: channel !== 'direct' && channel !== r.self_reported_source,
    };
  });
}

export function applyFilters(rows: EnrichedRegistration[], f: Filters): EnrichedRegistration[] {
  return rows.filter(
    (r) =>
      (!f.from || r.day >= f.from) &&
      (!f.to || r.day <= f.to) &&
      (!f.source || r.observedChannel === f.source) &&
      (!f.college || r.college === f.college) &&
      (!f.branch || r.branch === f.branch),
  );
}

export function validRows(data: MetricsData, f: Filters = {}): EnrichedRegistration[] {
  return applyFilters(enrich(data), f).filter((r) => r.valid);
}

export interface Kpis {
  total: number;
  valid: number;
  target: number;
  remaining: number;
  percent: number;
  today: number;
  referred: number;
  invalidRef: number;
  rejectedSelf: number;
  suspectedDuplicates: number;
  activeChannels: number;
}

export function kpis(data: MetricsData, f: Filters, now: Date): Kpis {
  const all = applyFilters(enrich(data), f);
  const valid = all.filter((r) => r.valid);
  const target = data.settings.target;
  const today = istDay(now);
  return {
    total: all.length,
    valid: valid.length,
    target,
    remaining: Math.max(target - valid.length, 0),
    percent: Math.round((valid.length / target) * 1000) / 10,
    today: valid.filter((r) => r.day === today).length,
    referred: valid.filter((r) => r.ref_status === 'valid').length,
    invalidRef: valid.filter((r) => r.ref_status === 'invalid_ref').length,
    rejectedSelf: valid.filter((r) => r.ref_status === 'rejected_self').length,
    suspectedDuplicates: valid.filter((r) => r.duplicateReasons.length > 0).length,
    activeChannels: new Set(valid.map((r) => r.observedChannel).filter((c) => c !== 'direct')).size,
  };
}

export interface DailyPoint {
  day: string;
  dayNumber: number;
  valid: number;
  target: number;
  cumulative: number;
  cumulativeTarget: number;
}

export function campaignDays(settings: CampaignSettings): string[] {
  return dayRange(settings.start_date, settings.end_date);
}

export function dailySeries(data: MetricsData, f: Filters): DailyPoint[] {
  const valid = validRows(data, { ...f, from: undefined, to: undefined });
  let cumulative = 0;
  let cumulativeTarget = 0;
  return campaignDays(data.settings)
    .map((day, i) => {
      const count = valid.filter((r) => r.day === day).length;
      const target = data.settings.daily_targets[i] ?? 0;
      cumulative += count;
      cumulativeTarget += target;
      return { day, dayNumber: i + 1, valid: count, target, cumulative, cumulativeTarget };
    })
    .filter((p) => (!f.from || p.day >= f.from) && (!f.to || p.day <= f.to));
}

export interface SourceBreakdown {
  rows: { channel: ObservedChannel; observed: number; selfReported: number }[];
  disagreements: number;
  knownObserved: number;
}

export function sourceBreakdown(data: MetricsData, f: Filters): SourceBreakdown {
  const valid = validRows(data, f);
  const rows = OBSERVED_CHANNELS.map((channel) => ({
    channel,
    observed: valid.filter((r) => r.observedChannel === channel).length,
    selfReported: valid.filter((r) => r.self_reported_source === channel).length,
  }));
  return {
    rows,
    disagreements: valid.filter((r) => r.disagrees).length,
    knownObserved: valid.filter((r) => r.observedChannel !== 'direct').length,
  };
}

export function countBy<K extends string>(rows: EnrichedRegistration[], key: (r: EnrichedRegistration) => K) {
  const counts = new Map<K, number>();
  for (const r of rows) counts.set(key(r), (counts.get(key(r)) ?? 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function collegeBreakdown(data: MetricsData, f: Filters) {
  return countBy(validRows(data, f), (r) => r.college);
}

export interface CodeStat {
  id: string;
  code: string;
  ownerType: ReferralCodeRecord['owner_type'];
  ownerLabel: string;
  status: ReferralCodeRecord['status'];
  opens: number;
  valid: number;
  conversion: number | null;
  lowSample: boolean;
}

/** Distinct (session, code) pairs from ref_link_open events. Unverified by nature. */
function linkOpens(events: EventRecord[], from?: string, to?: string): Map<string, number> {
  const pairs = new Set<string>();
  for (const e of events) {
    if (e.type !== 'ref_link_open' || !e.ref) continue;
    const day = istDay(e.ts);
    if ((from && day < from) || (to && day > to)) continue;
    pairs.add(`${e.session_id}|${e.ref.toUpperCase()}`);
  }
  const opens = new Map<string, number>();
  for (const pair of pairs) {
    const code = pair.split('|')[1];
    opens.set(code, (opens.get(code) ?? 0) + 1);
  }
  return opens;
}

export function codeStats(data: MetricsData, range: { from?: string; to?: string } = {}): CodeStat[] {
  const opens = linkOpens(data.events, range.from, range.to);
  const valid = validRows(data, range).filter((r) => r.ref_status === 'valid');
  return data.referralCodes
    .map((c) => {
      const o = opens.get(c.code) ?? 0;
      const v = valid.filter((r) => r.ref_code_id === c.id).length;
      return {
        id: c.id,
        code: c.code,
        ownerType: c.owner_type,
        ownerLabel: c.owner_label,
        status: c.status,
        opens: o,
        valid: v,
        conversion: o === 0 ? null : v / o,
        lowSample: o < LOW_SAMPLE_OPENS,
      };
    })
    .sort(rankCodes);
}

function rankCodes(a: CodeStat, b: CodeStat): number {
  return b.valid - a.valid || (b.conversion ?? -1) - (a.conversion ?? -1) || a.code.localeCompare(b.code);
}

export const FUNNEL_STEPS: EventType[] = ['landing_view', 'register_view', 'register_success'];

export function funnel(events: EventRecord[], range: { from?: string; to?: string } = {}) {
  const sessions = (type: EventType) =>
    new Set(
      events
        .filter((e) => e.type === type)
        .filter((e) => {
          const day = istDay(e.ts);
          return (!range.from || day >= range.from) && (!range.to || day <= range.to);
        })
        .map((e) => e.session_id),
    ).size;
  const counts = Object.fromEntries(
    (['landing_view', 'register_view', 'register_success', 'ref_link_open'] as EventType[]).map((t) => [t, sessions(t)]),
  ) as Record<EventType, number>;
  const steps = FUNNEL_STEPS.map((type, i) => {
    const prev = i === 0 ? null : counts[FUNNEL_STEPS[i - 1]];
    return { type, sessions: counts[type], fromPrevious: prev ? counts[type] / prev : null };
  });
  return { counts, steps };
}

export function eventsByDay(events: EventRecord[], days: string[]) {
  return days.map((day) => {
    const row: Record<string, string | number> = { day };
    for (const type of ['landing_view', 'register_view', 'register_success', 'ref_link_open'] as EventType[]) {
      row[type] = new Set(events.filter((e) => e.type === type && istDay(e.ts) === day).map((e) => e.session_id)).size;
    }
    return row;
  });
}

// Required share per channel from docs/measurement.md §2 (friend = peer referrals).
export const REQUIRED_SHARE: Partial<Record<ObservedChannel, number>> = {
  ambassador_club: 0.4,
  whatsapp: 0.25,
  friend: 0.2,
  instagram: 0.05 / 3,
  linkedin: 0.05 / 3,
  facebook: 0.05 / 3,
};

export interface Day3Decision {
  checkpointDay: string;
  daysCovered: number;
  valid: number;
  channels: { channel: ObservedChannel; valid: number; share: number; requiredPerDay: number | null; actualPerDay: number }[];
  codes: CodeStat[];
  topChannel: ObservedChannel | null;
  topCode: CodeStat | null;
  totalValid: number;
  daysRemaining: number;
  requiredPace: number | null;
  currentPace: number;
}

export function day3Decision(data: MetricsData, now: Date): Day3Decision {
  const { settings } = data;
  const today = istDay(now);
  const day3 = addDays(settings.start_date, 2);
  const checkpointDay = today < day3 ? today : day3;
  const daysCovered = Math.max(daysBetween(settings.start_date, checkpointDay) + 1, 0);
  const range = { from: settings.start_date, to: checkpointDay };
  const early = validRows(data, range);
  const totalDays = daysBetween(settings.start_date, settings.end_date) + 1;
  const channels = OBSERVED_CHANNELS.filter((c) => c !== 'direct')
    .map((channel) => {
      const v = early.filter((r) => r.observedChannel === channel).length;
      const share = REQUIRED_SHARE[channel];
      return {
        channel,
        valid: v,
        share: early.length ? v / early.length : 0,
        requiredPerDay: share === undefined ? null : (settings.target * share) / totalDays,
        actualPerDay: daysCovered ? v / daysCovered : 0,
      };
    })
    .sort((a, b) => b.valid - a.valid || a.channel.localeCompare(b.channel));
  const codes = codeStats(data, range).filter((c) => c.valid > 0 || c.opens > 0);
  const totalValid = validRows(data).length;
  const daysElapsed = Math.min(Math.max(daysBetween(settings.start_date, today) + 1, 0), totalDays);
  // Today counts as remaining while the window is open.
  const daysRemaining = Math.min(Math.max(daysBetween(today, settings.end_date) + 1, 0), totalDays);
  return {
    checkpointDay,
    daysCovered,
    valid: early.length,
    channels,
    codes,
    topChannel: channels[0]?.valid ? channels[0].channel : null,
    topCode: codes[0]?.valid ? codes[0] : null,
    totalValid,
    daysRemaining,
    requiredPace: daysRemaining > 0 ? Math.max(settings.target - totalValid, 0) / daysRemaining : null,
    currentPace: daysElapsed ? totalValid / daysElapsed : 0,
  };
}

export function budgetSummary(settings: CampaignSettings, validCount: number) {
  const planned = settings.planned_budget.reduce((s, b) => s + b.amount, 0);
  const actual = settings.actual_spend.reduce((s, b) => s + b.amount, 0);
  const byCategory = settings.planned_budget.map((b) => ({
    category: b.category,
    planned: b.amount,
    actual: settings.actual_spend.filter((s) => s.category === b.category).reduce((s, x) => s + x.amount, 0),
  }));
  return {
    planned,
    actual,
    byCategory,
    costPerRegistration: actual > 0 && validCount > 0 ? actual / validCount : null,
  };
}

/** Self-referral check shared by the service: same normalized email or same alias key. */
export function isSelfReferral(registrantEmail: string, ownerEmail: string | undefined): boolean {
  if (!ownerEmail) return false;
  return aliasKey(registrantEmail) === aliasKey(ownerEmail);
}

export function formatPercent(v: number | null, digits = 1): string {
  return v === null ? '—' : `${(v * 100).toFixed(digits)}%`;
}
