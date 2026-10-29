import { describe, expect, it } from 'vitest';
import expected from './fixtures/expected.json';
import { buildSeed } from '../src/api/seed';
import {
  budgetSummary,
  codeStats,
  collegeBreakdown,
  dailySeries,
  day3Decision,
  funnel,
  kpis,
  sourceBreakdown,
  type MetricsData,
} from '../src/lib/metrics';
import type { StoreState } from '../src/lib/schema';

const fakeHash = { hash: 'x', salt: 'y', iterations: 1 };

function metricsDataOf(state: StoreState): MetricsData {
  const users = new Map(state.users.map((u) => [u.id, u]));
  return {
    registrations: state.registrations.map((r) => ({ ...r, name: users.get(r.user_id)!.name, email: users.get(r.user_id)!.email })),
    referralCodes: state.referralCodes,
    events: state.events,
    settings: state.settings,
  };
}

const round4 = (n: number | null) => (n === null ? null : Math.round(n * 10000) / 10000);

describe('metrics on the seed match the hand-computed golden fixture', () => {
  const data = metricsDataOf(buildSeed(expected.anchorDay, { student: fakeHash, admin: fakeHash }, expected.now));
  const now = new Date(expected.now);

  it('KPIs', () => {
    expect(kpis(data, {}, now)).toEqual(expected.kpis);
  });

  it('daily line vs target curve', () => {
    const series = dailySeries(data, {});
    expect(series.map((p) => p.valid)).toEqual(expected.daily);
    expect(series.map((p) => p.cumulative)).toEqual(expected.cumulative);
    expect(series.map((p) => p.target)).toEqual(expected.dailyTargets);
  });

  it('observed vs self-reported sources; both sum to the valid total', () => {
    const { rows, disagreements } = sourceBreakdown(data, {});
    expect(Object.fromEntries(rows.map((r) => [r.channel, r.observed]))).toEqual(expected.observed);
    expect(Object.fromEntries(rows.map((r) => [r.channel, r.selfReported]))).toEqual(expected.selfReported);
    expect(rows.reduce((s, r) => s + r.observed, 0)).toBe(expected.kpis.valid);
    expect(rows.reduce((s, r) => s + r.selfReported, 0)).toBe(expected.kpis.valid);
    expect(disagreements).toBe(expected.disagreements);
  });

  it('colleges', () => {
    const colleges = collegeBreakdown(data, {});
    expect(Object.fromEntries(colleges.map((c) => [c.name, c.count]))).toEqual(expected.colleges);
    expect(colleges.reduce((s, c) => s + c.count, 0)).toBe(expected.kpis.valid);
  });

  it('referral codes: unverified opens, valid registrations, conversion, ranking', () => {
    const stats = codeStats(data);
    const active = stats.filter((c) => c.opens > 0 || c.valid > 0);
    expect(Object.fromEntries(active.map((c) => [c.code, { opens: c.opens, valid: c.valid, conversion: round4(c.conversion) }]))).toEqual(
      expected.codes,
    );
    expect(active.map((c) => c.code)).toEqual(expected.topCodesOrder);
    expect(stats.filter((c) => c.opens === 0).every((c) => c.conversion === null)).toBe(true);
    expect(stats.reduce((s, c) => s + c.valid, 0)).toBe(expected.kpis.referred);
  });

  it('funnel from tracked events only', () => {
    expect(funnel(data.events).counts).toEqual(expected.funnel);
  });

  it('day-3 decision view', () => {
    const d = day3Decision(data, now);
    expect(d.valid).toBe(expected.day3.valid);
    expect(Object.fromEntries(d.channels.filter((c) => c.valid > 0).map((c) => [c.channel, c.valid]))).toEqual(expected.day3.channels);
    expect(d.topChannel).toBe(expected.day3.topChannel);
    expect(Object.fromEntries(d.codes.map((c) => [c.code, { opens: c.opens, valid: c.valid }]))).toEqual(expected.day3.codes);
    expect(d.topCode?.code).toBe(expected.day3.topCode);
  });

  it('budget: planned only, no cost per registration without actual spend', () => {
    const { planned, actual, costPerRegistration } = budgetSummary(data.settings, expected.kpis.valid);
    expect({ planned, actual, costPerRegistration }).toEqual(expected.budget);
  });
});
