// The one interface the UI talks to. LocalStore implements it over localStorage; a cloud adapter
// could implement the same contract later. Every method that touches private data takes the
// caller's session and the implementation authorizes it — route guards are only UX.
import type { MetricsData, RegistrationRow } from '../lib/metrics';
import type {
  AuditRecord,
  CampaignSettings,
  CampaignSettingsPatch,
  ChangePasswordInput,
  ObservedAttribution,
  ReferralCodeInput,
  ReferralCodeRecord,
  RefStatus,
  RegisterInput,
  RegistrationRecord,
  RegistrationStatus,
  SelfReportedSource,
  ResetPasswordInput,
  Role,
  SpendInput,
  StudentProfilePatch,
  SuggestionInput,
  SuggestionRecord,
  SuggestionStatus,
  TrackEventInput,
  UserRecord,
} from '../lib/schema';

export interface Session {
  token: string;
  userId: string;
  role: Role;
  expiresAt: string;
}

export type CurrentSession =
  | { status: 'none' }
  | { status: 'expired'; role: Role }
  | { status: 'active'; session: Session };

export type PublicUser = Omit<UserRecord, 'password_hash' | 'password_salt' | 'password_iterations'>;

export interface StudentProfile {
  user: PublicUser;
  registration: RegistrationRecord;
  code: ReferralCodeRecord;
}

export interface ReferredPerson {
  firstName: string;
  date: string;
  status: 'counted' | 'self_referral' | 'not_counted';
}

export interface PublicCampaign {
  name: string;
  target: number;
  validRegistrations: number;
  startDate: string;
  endDate: string;
  sources: SelfReportedSource[];
  whatsappUrl?: string;
}

export interface AdminSuggestion extends SuggestionRecord {
  studentName: string;
  studentEmail: string;
}

export interface DataSource {
  // lifecycle
  init(): Promise<void>;
  subscribe(listener: () => void): () => void;
  resetDemoData(): Promise<void>;

  // public / anonymous
  getPublicCampaign(): Promise<PublicCampaign>;
  lookupReferralCode(code: string): Promise<{ exists: boolean }>;
  trackEvent(input: TrackEventInput): Promise<void>;

  // auth
  register(
    input: RegisterInput,
    attribution: { observed: ObservedAttribution; anonSessionId: string },
  ): Promise<{ session: Session; refStatus: RefStatus; code: string }>;
  login(email: string, password: string, portal: Role): Promise<Session>;
  logout(session: Session): Promise<void>;
  getCurrentSession(): CurrentSession;
  clearCurrentSession(): void;
  resetPasswordLocal(input: ResetPasswordInput): Promise<void>;
  changePassword(session: Session, input: ChangePasswordInput): Promise<void>;
  getMe(session: Session): Promise<PublicUser>;

  // student
  getMyProfile(session: Session): Promise<StudentProfile>;
  updateMyProfile(session: Session, patch: StudentProfilePatch): Promise<void>;
  requestAccountDeletion(session: Session): Promise<void>;
  getMyReferrals(session: Session): Promise<ReferredPerson[]>;
  createSuggestion(session: Session, input: SuggestionInput): Promise<void>;
  listMySuggestions(session: Session): Promise<SuggestionRecord[]>;

  // admin
  getMetricsData(session: Session): Promise<MetricsData>;
  listRegistrations(session: Session): Promise<RegistrationRow[]>;
  updateRegistrationStatus(session: Session, id: string, status: RegistrationStatus, note?: string): Promise<void>;
  listAuditLog(session: Session): Promise<AuditRecord[]>;
  createReferralCode(session: Session, input: ReferralCodeInput): Promise<void>;
  setReferralCodeStatus(session: Session, id: string, status: ReferralCodeRecord['status']): Promise<void>;
  getCampaignSettings(session: Session): Promise<CampaignSettings>;
  updateCampaignSettings(session: Session, patch: CampaignSettingsPatch): Promise<void>;
  addSpend(session: Session, input: SpendInput): Promise<void>;
  removeSpend(session: Session, id: string): Promise<void>;
  listAllSuggestions(session: Session): Promise<AdminSuggestion[]>;
  respondToSuggestion(session: Session, id: string, status: SuggestionStatus, response?: string): Promise<void>;
  updateAdminName(session: Session, name: string): Promise<void>;
}
