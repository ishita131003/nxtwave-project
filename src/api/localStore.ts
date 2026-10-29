// LocalStore: the DataSource over localStorage. The only module that touches localStorage.
//
// - One versioned key (nxg:v1) holds the whole state; `migrate` upgrades older shapes.
// - Writes are read-check-write in a single synchronous block (no await inside), so a
//   registration's duplicate check and referral resolution are atomic within the tab.
// - The `storage` event keeps other open tabs in sync.
// - Every private method authorizes the session token against stored session rows and the
//   user's stored role; the role on the client-side Session object is never trusted.
import { istDay } from '../lib/dates';
import { normalizeEmail } from '../lib/email';
import { hashPassword, randomCode, randomId, verifyPassword } from '../lib/crypto';
import { campaignDays, isSelfReferral, isValidRegistration, type MetricsData } from '../lib/metrics';
import {
  AdminProfilePatch,
  CampaignSettingsPatch,
  ChangePasswordInput,
  ReferralCodeInput,
  RegisterInput,
  RegistrationStatusInput,
  ResetPasswordInput,
  SCHEMA_VERSION,
  SpendInput,
  StoreState,
  StudentProfilePatch,
  SuggestionInput,
  SuggestionResponseInput,
  TrackEventInput,
  type ObservedAttribution,
  type ReferralCodeRecord,
  type RefStatus,
  type Role,
  type UserRecord,
} from '../lib/schema';
import type { CurrentSession, DataSource, PublicUser, Session } from './dataSource';
import { parse, ServiceError } from './errors';
import { buildSeed, DEMO_ADMIN, DEMO_STUDENT } from './seed';

export const STORAGE_KEY = `nxg:v${SCHEMA_VERSION}`;
export const SESSION_KEY = `${STORAGE_KEY}:session`;
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const MAX_SUGGESTIONS_PER_DAY = 5;

// Migrations from version N to N+1, applied in order on load. v1 is the first shipped schema.
const MIGRATIONS: Record<number, (state: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrate(raw: Record<string, unknown>): StoreState {
  let state = raw;
  let version = Number(state.schemaVersion);
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new ServiceError('corrupt_store', `No migration from schema v${version}.`);
    state = { ...step(state), schemaVersion: version + 1 };
    version += 1;
  }
  const parsed = StoreState.safeParse(state);
  if (!parsed.success) throw new ServiceError('corrupt_store', 'Stored demo data is unreadable. Reset demo data to continue.');
  return parsed.data;
}

function toPublicUser(u: UserRecord): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, password_salt, password_iterations, ...rest } = u;
  return rest;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0];

export interface LocalStoreOptions {
  storage: Storage;
  now?: () => Date;
  listenToStorageEvents?: boolean;
}

export class LocalStore implements DataSource {
  private storage: Storage;
  private now: () => Date;
  private listeners = new Set<() => void>();
  private cache: { raw: string; state: StoreState } | null = null;

  constructor(opts: LocalStoreOptions) {
    this.storage = opts.storage;
    this.now = opts.now ?? (() => new Date());
    if (opts.listenToStorageEvents) {
      window.addEventListener('storage', (e) => {
        if (e.key === null || e.key.startsWith(STORAGE_KEY)) {
          this.cache = null;
          this.emit();
        }
      });
    }
  }

  // ---------- storage plumbing ----------

  private read(): StoreState {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (raw === null) throw new ServiceError('corrupt_store', 'Demo data has not been initialised.');
    if (this.cache?.raw === raw) return this.cache.state;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ServiceError('corrupt_store', 'Stored demo data is not valid JSON. Reset demo data to continue.');
    }
    const state = migrate(json);
    this.cache = { raw, state };
    return state;
  }

  private write(state: StoreState): void {
    const raw = JSON.stringify(state);
    this.storage.setItem(STORAGE_KEY, raw);
    this.cache = { raw, state };
    this.emit();
  }

  /** Synchronous read-modify-write. `fn` must not await. */
  private transact<T>(fn: (state: StoreState) => T): T {
    const state = structuredClone(this.read());
    const result = fn(state);
    this.write(state);
    return result;
  }

  private emit() {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private nowIso() {
    return this.now().toISOString();
  }

  // ---------- lifecycle ----------

  async init(): Promise<void> {
    if (this.storage.getItem(STORAGE_KEY) === null) await this.seed();
    else this.read();
  }

  private async seed(): Promise<void> {
    const [student, admin] = await Promise.all([hashPassword(DEMO_STUDENT.password), hashPassword(DEMO_ADMIN.password)]);
    this.storage.removeItem(SESSION_KEY);
    this.write(buildSeed(istDay(this.now()), { student, admin }, this.nowIso()));
  }

  async resetDemoData(): Promise<void> {
    await this.seed();
  }

  // ---------- authorization ----------

  private authorize(session: Session, role: Role): { state: StoreState; user: UserRecord } {
    const state = this.read();
    const row = state.sessions.find((s) => s.token === session?.token);
    if (!row) throw new ServiceError('unauthenticated', 'Please sign in.');
    if (Date.parse(row.expires_at) <= this.now().getTime()) throw new ServiceError('session_expired', 'Your session expired. Please sign in again.');
    const user = state.users.find((u) => u.id === row.user_id);
    if (!user) throw new ServiceError('unauthenticated', 'Please sign in.');
    if (user.role !== role) throw new ServiceError('forbidden', 'You do not have access to this.');
    return { state, user };
  }

  private requireStudent(session: Session) {
    return this.authorize(session, 'student');
  }

  private requireAdmin(session: Session) {
    return this.authorize(session, 'admin');
  }

  private createSession(state: StoreState, user: UserRecord): Session {
    const now = this.now();
    const token = randomId('sess');
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    state.sessions = state.sessions.filter((s) => Date.parse(s.expires_at) > now.getTime());
    state.sessions.push({ token, user_id: user.id, role: user.role, created_at: now.toISOString(), expires_at: expiresAt });
    this.storage.setItem(SESSION_KEY, token);
    return { token, userId: user.id, role: user.role, expiresAt };
  }

  // ---------- public ----------

  async getPublicCampaign() {
    const { settings, registrations } = this.read();
    return {
      name: settings.name,
      target: settings.target,
      validRegistrations: registrations.filter(isValidRegistration).length,
      startDate: settings.start_date,
      endDate: settings.end_date,
      sources: settings.sources,
      whatsappUrl: settings.whatsapp_url,
    };
  }

  private findActiveCode(state: StoreState, code: string): ReferralCodeRecord | undefined {
    // Paused codes no longer accept new referrals and resolve like unknown codes.
    return state.referralCodes.find((c) => c.code === code.trim().toUpperCase() && c.status === 'active');
  }

  async lookupReferralCode(code: string) {
    return { exists: Boolean(this.findActiveCode(this.read(), code)) };
  }

  async trackEvent(input: Parameters<DataSource['trackEvent']>[0]) {
    const event = parse(TrackEventInput, input);
    this.transact((state) => {
      state.events.push({ id: randomId('evt'), ts: this.nowIso(), fictional: false, ...event, ref: event.ref?.toUpperCase() });
    });
  }

  // ---------- auth ----------

  async register(input: Parameters<DataSource['register']>[0], attribution: { observed: ObservedAttribution; anonSessionId: string }) {
    const data = parse(RegisterInput, input);
    const pw = await hashPassword(data.password);
    return this.transact((state) => {
      const emailNormalized = normalizeEmail(data.email);
      if (state.users.some((u) => u.email_normalized === emailNormalized)) {
        throw new ServiceError('duplicate_email', 'An account with this email already exists. Sign in instead.', {
          email: 'This email is already registered.',
        });
      }
      const now = this.nowIso();
      let refStatus: RefStatus = 'none';
      let refCode: ReferralCodeRecord | undefined;
      if (data.referral_code) {
        refCode = this.findActiveCode(state, data.referral_code);
        refStatus = !refCode ? 'invalid_ref' : isSelfReferral(emailNormalized, refCode.owner_email_normalized) ? 'rejected_self' : 'valid';
      }
      const user: UserRecord = {
        id: randomId('u'),
        role: 'student',
        name: data.name,
        email: data.email.trim(),
        email_normalized: emailNormalized,
        password_hash: pw.hash,
        password_salt: pw.salt,
        password_iterations: pw.iterations,
        created_at: now,
        fictional: false,
      };
      let code = randomCode('STU');
      while (state.referralCodes.some((c) => c.code === code)) code = randomCode('STU');
      state.users.push(user);
      state.registrations.push({
        id: randomId('reg'),
        user_id: user.id,
        college: data.college,
        branch: data.branch,
        year: data.year,
        city: data.city,
        state: data.state,
        consent: data.consent,
        self_reported_source: data.self_reported_source,
        observed: attribution.observed,
        ref_code_entered: data.referral_code,
        ref_status: refStatus,
        ref_code_id: refStatus === 'valid' ? refCode?.id : undefined,
        status: 'registered',
        deletion_requested: false,
        created_at: now,
        fictional: false,
      });
      state.referralCodes.push({
        id: randomId('code'),
        code,
        owner_type: 'student',
        owner_user_id: user.id,
        owner_label: `Student · ${user.name}`,
        owner_email_normalized: emailNormalized,
        status: 'active',
        created_at: now,
        fictional: false,
      });
      state.events.push({
        id: randomId('evt'),
        type: 'register_success',
        session_id: attribution.anonSessionId,
        ts: now,
        ref: attribution.observed.ref,
        utm_source: attribution.observed.utm_source,
        utm_medium: attribution.observed.utm_medium,
        utm_campaign: attribution.observed.utm_campaign,
        fictional: false,
      });
      return { session: this.createSession(state, user), refStatus, code };
    });
  }

  async login(email: string, password: string, portal: Role): Promise<Session> {
    const generic = new ServiceError('invalid_credentials', 'Email or password is incorrect.');
    const user = this.read().users.find((u) => u.email_normalized === normalizeEmail(email));
    if (!user || !user.password_hash || !user.password_salt) throw generic;
    const ok = await verifyPassword(password, { hash: user.password_hash, salt: user.password_salt, iterations: user.password_iterations });
    if (!ok) throw generic;
    if (user.role !== portal) {
      throw new ServiceError(
        'invalid_credentials',
        portal === 'admin' ? 'These credentials do not work on the admin login.' : 'Admins sign in at /admin/login.',
      );
    }
    return this.transact((state) => this.createSession(state, user));
  }

  async logout(session: Session) {
    this.transact((state) => {
      state.sessions = state.sessions.filter((s) => s.token !== session.token);
    });
    this.storage.removeItem(SESSION_KEY);
  }

  getCurrentSession(): CurrentSession {
    const token = this.storage.getItem(SESSION_KEY);
    if (!token) return { status: 'none' };
    const row = this.read().sessions.find((s) => s.token === token);
    if (!row) return { status: 'none' };
    if (Date.parse(row.expires_at) <= this.now().getTime()) return { status: 'expired', role: row.role };
    return { status: 'active', session: { token, userId: row.user_id, role: row.role, expiresAt: row.expires_at } };
  }

  clearCurrentSession() {
    this.storage.removeItem(SESSION_KEY);
    this.emit();
  }

  async resetPasswordLocal(input: Parameters<DataSource['resetPasswordLocal']>[0]) {
    const data = parse(ResetPasswordInput, input);
    const pw = await hashPassword(data.newPassword);
    this.transact((state) => {
      const user = state.users.find((u) => u.email_normalized === normalizeEmail(data.email) && u.role === 'student');
      const reg = user && state.registrations.find((r) => r.user_id === user.id);
      const collegeMatches = reg && reg.college.trim().toLowerCase() === data.college.trim().toLowerCase();
      if (!user || !user.password_hash || !collegeMatches) {
        throw new ServiceError('not_found', 'No account matches that email and college.');
      }
      user.password_hash = pw.hash;
      user.password_salt = pw.salt;
      user.password_iterations = pw.iterations;
      state.sessions = state.sessions.filter((s) => s.user_id !== user.id);
    });
  }

  async changePassword(session: Session, input: Parameters<DataSource['changePassword']>[1]) {
    const { user } = this.authorize(session, session.role);
    const data = parse(ChangePasswordInput, input);
    const ok = await verifyPassword(data.currentPassword, {
      hash: user.password_hash ?? '',
      salt: user.password_salt ?? '',
      iterations: user.password_iterations,
    });
    if (!ok) throw new ServiceError('invalid_credentials', 'Current password is incorrect.', { currentPassword: 'Incorrect password' });
    const pw = await hashPassword(data.newPassword);
    this.transact((state) => {
      const u = state.users.find((x) => x.id === user.id)!;
      u.password_hash = pw.hash;
      u.password_salt = pw.salt;
      u.password_iterations = pw.iterations;
      state.sessions = state.sessions.filter((s) => s.user_id !== user.id || s.token === session.token);
    });
  }

  async getMe(session: Session) {
    return toPublicUser(this.authorize(session, session.role).user);
  }

  // ---------- student ----------

  async getMyProfile(session: Session) {
    const { state, user } = this.requireStudent(session);
    const registration = state.registrations.find((r) => r.user_id === user.id);
    const code = state.referralCodes.find((c) => c.owner_type === 'student' && c.owner_user_id === user.id);
    if (!registration || !code) throw new ServiceError('not_found', 'Registration not found.');
    return { user: toPublicUser(user), registration, code };
  }

  async updateMyProfile(session: Session, patch: Parameters<DataSource['updateMyProfile']>[1]) {
    const { user } = this.requireStudent(session);
    const data = parse(StudentProfilePatch, patch);
    this.transact((state) => {
      const reg = state.registrations.find((r) => r.user_id === user.id)!;
      if (data.name !== undefined) state.users.find((u) => u.id === user.id)!.name = data.name;
      if (data.college !== undefined) reg.college = data.college;
      if (data.branch !== undefined) reg.branch = data.branch;
      if (data.year !== undefined) reg.year = data.year;
      if ('city' in data) reg.city = data.city;
      if ('state' in data) reg.state = data.state;
    });
  }

  async requestAccountDeletion(session: Session) {
    const { user } = this.requireStudent(session);
    this.transact((state) => {
      state.registrations.find((r) => r.user_id === user.id)!.deletion_requested = true;
    });
  }

  async getMyReferrals(session: Session) {
    const { state, user } = this.requireStudent(session);
    const code = state.referralCodes.find((c) => c.owner_type === 'student' && c.owner_user_id === user.id);
    if (!code) return [];
    const names = new Map(state.users.map((u) => [u.id, u.name]));
    return state.registrations
      .filter((r) => r.ref_code_entered === code.code && r.user_id !== user.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((r) => ({
        firstName: firstName(names.get(r.user_id) ?? ''),
        date: istDay(r.created_at),
        status:
          r.ref_status === 'rejected_self'
            ? ('self_referral' as const)
            : r.ref_status === 'valid' && isValidRegistration(r)
              ? ('counted' as const)
              : ('not_counted' as const),
      }));
  }

  async createSuggestion(session: Session, input: Parameters<DataSource['createSuggestion']>[1]) {
    const { user } = this.requireStudent(session);
    const data = parse(SuggestionInput, input);
    this.transact((state) => {
      const today = istDay(this.now());
      const todays = state.suggestions.filter((s) => s.user_id === user.id && istDay(s.created_at) === today).length;
      if (todays >= MAX_SUGGESTIONS_PER_DAY) {
        throw new ServiceError('rate_limited', `You can send up to ${MAX_SUGGESTIONS_PER_DAY} suggestions a day. Try again tomorrow.`);
      }
      const now = this.nowIso();
      state.suggestions.push({ id: randomId('sg'), user_id: user.id, ...data, status: 'new', created_at: now, updated_at: now, fictional: false });
    });
  }

  async listMySuggestions(session: Session) {
    const { state, user } = this.requireStudent(session);
    return state.suggestions.filter((s) => s.user_id === user.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  // ---------- admin ----------

  private registrationRows(state: StoreState) {
    const users = new Map(state.users.map((u) => [u.id, u]));
    return state.registrations.map((r) => ({ ...r, name: users.get(r.user_id)?.name ?? '', email: users.get(r.user_id)?.email ?? '' }));
  }

  async getMetricsData(session: Session): Promise<MetricsData> {
    const { state } = this.requireAdmin(session);
    return {
      registrations: this.registrationRows(state),
      referralCodes: state.referralCodes,
      events: state.events,
      settings: state.settings,
    };
  }

  async listRegistrations(session: Session) {
    return this.registrationRows(this.requireAdmin(session).state);
  }

  async updateRegistrationStatus(session: Session, id: string, status: Parameters<DataSource['updateRegistrationStatus']>[2], note?: string) {
    const { user } = this.requireAdmin(session);
    const data = parse(RegistrationStatusInput, { status, note });
    this.transact((state) => {
      const reg = state.registrations.find((r) => r.id === id);
      if (!reg) throw new ServiceError('not_found', 'Registration not found.');
      if (reg.status === data.status) return;
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'registration.status', target_id: id, from: reg.status, to: data.status, note: data.note, ts: this.nowIso() });
      reg.status = data.status;
    });
  }

  async listAuditLog(session: Session) {
    return [...this.requireAdmin(session).state.audit].sort((a, b) => b.ts.localeCompare(a.ts));
  }

  async createReferralCode(session: Session, input: Parameters<DataSource['createReferralCode']>[1]) {
    const { user } = this.requireAdmin(session);
    const data = parse(ReferralCodeInput, input);
    this.transact((state) => {
      if (state.referralCodes.some((c) => c.code === data.code)) {
        throw new ServiceError('conflict', 'That code already exists.', { code: 'Code already exists' });
      }
      const id = randomId('code');
      state.referralCodes.push({
        id,
        code: data.code,
        owner_type: data.owner_type,
        owner_label: data.owner_label,
        owner_email_normalized: data.owner_email ? normalizeEmail(data.owner_email) : undefined,
        status: 'active',
        created_at: this.nowIso(),
        fictional: false,
      });
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'code.create', target_id: id, to: data.code, ts: this.nowIso() });
    });
  }

  async setReferralCodeStatus(session: Session, id: string, status: ReferralCodeRecord['status']) {
    const { user } = this.requireAdmin(session);
    this.transact((state) => {
      const code = state.referralCodes.find((c) => c.id === id);
      if (!code) throw new ServiceError('not_found', 'Code not found.');
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'code.status', target_id: id, from: code.status, to: status, ts: this.nowIso() });
      code.status = status;
    });
  }

  async getCampaignSettings(session: Session) {
    return this.requireAdmin(session).state.settings;
  }

  async updateCampaignSettings(session: Session, patch: Parameters<DataSource['updateCampaignSettings']>[1]) {
    const { user } = this.requireAdmin(session);
    const data = parse(CampaignSettingsPatch, patch);
    this.transact((state) => {
      const next = { ...state.settings, ...data };
      if ('whatsapp_url' in data) next.whatsapp_url = data.whatsapp_url;
      const days = campaignDays(next).length;
      if (next.end_date < next.start_date) throw new ServiceError('validation', 'End date must be on or after the start date.', { end_date: 'Must be on or after start' });
      if (next.daily_targets.length !== days) {
        throw new ServiceError('validation', `The daily target curve needs one value per campaign day (${days}).`, { daily_targets: `Needs ${days} values` });
      }
      const sum = next.daily_targets.reduce((a, b) => a + b, 0);
      if (sum !== next.target) {
        throw new ServiceError('validation', `Daily targets add up to ${sum}; they must add up to the target (${next.target}).`, { daily_targets: `Sum is ${sum}, target is ${next.target}` });
      }
      state.settings = next;
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'settings.update', target_id: 'settings', note: Object.keys(data).join(', '), ts: this.nowIso() });
    });
  }

  async addSpend(session: Session, input: Parameters<DataSource['addSpend']>[1]) {
    const { user } = this.requireAdmin(session);
    const data = parse(SpendInput, input);
    this.transact((state) => {
      const id = randomId('spend');
      state.settings.actual_spend.push({ id, ...data });
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'spend.add', target_id: id, to: String(data.amount), ts: this.nowIso() });
    });
  }

  async removeSpend(session: Session, id: string) {
    const { user } = this.requireAdmin(session);
    this.transact((state) => {
      state.settings.actual_spend = state.settings.actual_spend.filter((s) => s.id !== id);
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'spend.remove', target_id: id, ts: this.nowIso() });
    });
  }

  async listAllSuggestions(session: Session) {
    const { state } = this.requireAdmin(session);
    const users = new Map(state.users.map((u) => [u.id, u]));
    return state.suggestions
      .map((s) => ({ ...s, studentName: users.get(s.user_id)?.name ?? '', studentEmail: users.get(s.user_id)?.email ?? '' }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async respondToSuggestion(session: Session, id: string, status: Parameters<DataSource['respondToSuggestion']>[2], response?: string) {
    const { user } = this.requireAdmin(session);
    const data = parse(SuggestionResponseInput, { status, admin_response: response });
    this.transact((state) => {
      const s = state.suggestions.find((x) => x.id === id);
      if (!s) throw new ServiceError('not_found', 'Suggestion not found.');
      state.audit.push({ id: randomId('aud'), actor_user_id: user.id, action: 'suggestion.respond', target_id: id, from: s.status, to: data.status, ts: this.nowIso() });
      s.status = data.status;
      s.admin_response = data.admin_response || undefined;
      s.updated_at = this.nowIso();
    });
  }

  async updateAdminName(session: Session, name: string) {
    const { user } = this.requireAdmin(session);
    const data = parse(AdminProfilePatch, { name });
    this.transact((state) => {
      state.users.find((u) => u.id === user.id)!.name = data.name;
    });
  }
}
