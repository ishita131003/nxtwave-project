import { beforeEach, describe, expect, it } from 'vitest';
import expected from './fixtures/expected.json';
import { LocalStore, SESSION_TTL_MS, STORAGE_KEY } from '../src/api/localStore';
import { DEMO_ADMIN, DEMO_STUDENT } from '../src/api/seed';
import { ServiceError } from '../src/api/errors';
import { readAttribution, trackLanding } from '../src/lib/attribution';
import { referralUrl } from '../src/lib/share';
import { codeStats, dailySeries, kpis } from '../src/lib/metrics';
import type { RegisterInput } from '../src/lib/schema';

let clock: Date;
let store: LocalStore;

const newStudent = (over: Partial<RegisterInput> = {}): RegisterInput => ({
  name: 'Asha Kumar',
  email: 'asha.kumar@example.com',
  password: 'AshaPass123',
  confirmPassword: 'AshaPass123',
  college: 'Sahyadri Institute of Technology (fictional)',
  branch: 'CSE',
  year: '4',
  consent: true,
  self_reported_source: 'friend',
  ...over,
});
const attribution = { observed: {}, anonSessionId: 'test-anon-session' };

async function rejects(p: Promise<unknown>, code: ServiceError['code']) {
  await expect(p).rejects.toSatisfy((e: unknown) => e instanceof ServiceError && e.code === code);
}

beforeEach(async () => {
  localStorage.clear();
  sessionStorage.clear();
  clock = new Date(expected.now);
  store = new LocalStore({ storage: localStorage, now: () => clock });
  await store.init();
});

describe('auth', () => {
  it('seeds demo accounts that only work on their own portal; nothing stored in plaintext', async () => {
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain(DEMO_STUDENT.password);
    expect(localStorage.getItem(STORAGE_KEY)).not.toContain(DEMO_ADMIN.password);
    await expect(store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student')).resolves.toMatchObject({ role: 'student' });
    await rejects(store.login(DEMO_ADMIN.email, DEMO_ADMIN.password, 'student'), 'invalid_credentials');
    await rejects(store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'admin'), 'invalid_credentials');
    await rejects(store.login(DEMO_STUDENT.email, 'wrong-password1', 'student'), 'invalid_credentials');
  });

  it('expires sessions after 8 hours', async () => {
    const session = await store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    expect(store.getCurrentSession().status).toBe('active');
    clock = new Date(clock.getTime() + SESSION_TTL_MS + 1);
    expect(store.getCurrentSession()).toEqual({ status: 'expired', role: 'student' });
    await rejects(store.getMyProfile(session), 'session_expired');
  });
});

describe('service-layer authorization', () => {
  it('students cannot call admin methods, change roles, or forge a role on the session object', async () => {
    const student = await store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    await rejects(store.getMetricsData(student), 'forbidden');
    await rejects(store.listRegistrations(student), 'forbidden');
    await rejects(store.updateRegistrationStatus(student, 'reg_r02', 'rejected'), 'forbidden');
    await rejects(store.getMetricsData({ ...student, role: 'admin' }), 'forbidden');
    await rejects(store.updateMyProfile(student, { role: 'admin' } as never), 'validation');
    await rejects(store.updateMyProfile(student, { email: 'x@example.com' } as never), 'validation');
    await rejects(store.getMyProfile({ token: 'forged', userId: 'u_r02', role: 'student', expiresAt: '' }), 'unauthenticated');
  });

  it('admins cannot use student-only methods', async () => {
    const admin = await store.login(DEMO_ADMIN.email, DEMO_ADMIN.password, 'admin');
    await rejects(store.getMyProfile(admin), 'forbidden');
  });
});

describe('registration and referral resolution', () => {
  it('rejects a duplicate normalized email', async () => {
    await rejects(store.register(newStudent({ email: '  Student.Demo@Example.com ' }), attribution), 'duplicate_email');
  });

  it('resolves valid, invalid and self referrals', async () => {
    expect((await store.register(newStudent({ referral_code: 'amb-kaveri' }), attribution)).refStatus).toBe('valid');
    expect((await store.register(newStudent({ email: 'b@example.com', referral_code: 'NOPE-123' }), attribution)).refStatus).toBe('invalid_ref');
    // Alias of the code owner (riya.sharma@gmail.com owns STU-RIYA22).
    expect((await store.register(newStudent({ email: 'r.iyasharma+x@gmail.com', referral_code: 'STU-RIYA22' }), attribution)).refStatus).toBe(
      'rejected_self',
    );
  });

  it('caps suggestions at 5 per day', async () => {
    const s = await store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    const input = { idea: 'An idea here', category: 'other' as const, description: 'Long enough description', contact_preference: 'in_app' as const };
    for (let i = 0; i < 5; i++) await store.createSuggestion(s, input);
    await rejects(store.createSuggestion(s, input), 'rate_limited');
  });
});

describe('end-to-end referral flow (one browser storage)', () => {
  it('a shared link credits the referrer and moves the admin KPIs; reset restores the golden numbers', async () => {
    // Student A copies their referral link, then logs out.
    const a = await store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    const { code } = await store.getMyProfile(a);
    const link = new URL(referralUrl('http://localhost:5173', code.code, 'whatsapp'));
    await store.logout(a);
    expect(store.getCurrentSession().status).toBe('none');

    // The link is opened; the landing page captures attribution and logs events.
    clock = new Date(clock.getTime() + 60_000);
    await trackLanding(store, link.search, sessionStorage);
    const observed = readAttribution(sessionStorage);
    expect(observed).toMatchObject({ ref: 'STU-DEMO01', utm_source: 'whatsapp' });

    // A new student registers with the prefilled code.
    const reg = await store.register(newStudent({ referral_code: observed.ref }), { observed, anonSessionId: 'friend-session' });
    expect(reg.refStatus).toBe('valid');
    await store.logout(reg.session);

    // Student A sees the referral (first name, date, status only).
    const a2 = await store.login(DEMO_STUDENT.email, DEMO_STUDENT.password, 'student');
    const referrals = await store.getMyReferrals(a2);
    expect(referrals[0]).toEqual({ firstName: 'Asha', date: expected.anchorDay, status: 'counted' });
    expect(Object.keys(referrals[0])).toEqual(['firstName', 'date', 'status']);
    await store.logout(a2);

    // Admin sees the KPI and chart increment.
    const admin = await store.login(DEMO_ADMIN.email, DEMO_ADMIN.password, 'admin');
    const data = await store.getMetricsData(admin);
    const k = kpis(data, {}, clock);
    expect(k.valid).toBe(expected.kpis.valid + 1);
    expect(k.today).toBe(expected.kpis.today + 1);
    expect(k.referred).toBe(expected.kpis.referred + 1);
    expect(dailySeries(data, {}).at(-1)!.valid).toBe(expected.daily.at(-1)! + 1);
    const demoCode = codeStats(data).find((c) => c.code === 'STU-DEMO01')!;
    expect({ opens: demoCode.opens, valid: demoCode.valid }).toEqual({ opens: 7, valid: 4 });

    // Reset Demo Data restores the golden numbers and signs everyone out.
    await store.resetDemoData();
    expect(store.getCurrentSession().status).toBe('none');
    const admin2 = await store.login(DEMO_ADMIN.email, DEMO_ADMIN.password, 'admin');
    expect(kpis(await store.getMetricsData(admin2), {}, clock)).toEqual(expected.kpis);
  });
});
