import { z } from 'zod';

// ---------- Enumerations ----------

export const SELF_REPORTED_SOURCES = [
  'ambassador_club',
  'whatsapp',
  'friend',
  'instagram',
  'linkedin',
  'facebook',
  'other',
] as const;
export const SelfReportedSource = z.enum(SELF_REPORTED_SOURCES);
export type SelfReportedSource = z.infer<typeof SelfReportedSource>;

export const OBSERVED_CHANNELS = [...SELF_REPORTED_SOURCES, 'direct'] as const;
export type ObservedChannel = (typeof OBSERVED_CHANNELS)[number];

export const SOURCE_LABELS: Record<ObservedChannel, string> = {
  ambassador_club: 'Ambassador / club',
  whatsapp: 'WhatsApp',
  friend: 'Friend (peer referral)',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  other: 'Other',
  direct: 'Direct / untracked',
};

export const YEARS = ['1', '2', '3', '4', 'graduate'] as const;
export const YEAR_LABELS: Record<(typeof YEARS)[number], string> = {
  '1': '1st year',
  '2': '2nd year',
  '3': '3rd year',
  '4': 'Final year',
  graduate: 'Graduated',
};

export const BRANCHES = ['CSE', 'IT', 'AI & DS', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Other'] as const;

export const Role = z.enum(['student', 'admin']);
export type Role = z.infer<typeof Role>;

export const RegistrationStatus = z.enum(['registered', 'verified', 'rejected']);
export type RegistrationStatus = z.infer<typeof RegistrationStatus>;

export const RefStatus = z.enum(['none', 'valid', 'invalid_ref', 'rejected_self']);
export type RefStatus = z.infer<typeof RefStatus>;

export const OwnerType = z.enum(['student', 'ambassador', 'club']);
export type OwnerType = z.infer<typeof OwnerType>;

export const EventType = z.enum(['landing_view', 'register_view', 'register_success', 'ref_link_open']);
export type EventType = z.infer<typeof EventType>;

export const SUGGESTION_CATEGORIES = [
  'campaign_idea',
  'workshop_topic',
  'student_experience',
  'technical_issue',
  'other',
] as const;
export const SuggestionCategory = z.enum(SUGGESTION_CATEGORIES);
export const SUGGESTION_CATEGORY_LABELS: Record<(typeof SUGGESTION_CATEGORIES)[number], string> = {
  campaign_idea: 'Campaign idea',
  workshop_topic: 'Workshop topic',
  student_experience: 'Student experience',
  technical_issue: 'Technical issue',
  other: 'Other',
};

export const SuggestionStatus = z.enum(['new', 'reviewing', 'planned', 'completed', 'declined']);
export type SuggestionStatus = z.infer<typeof SuggestionStatus>;

export const ContactPreference = z.enum(['in_app', 'email', 'no_contact']);
export const CONTACT_LABELS: Record<z.infer<typeof ContactPreference>, string> = {
  in_app: 'Reply here in the app',
  email: 'Email me (demo: no email is actually sent)',
  no_contact: "Don't contact me",
};

export const BudgetCategory = z.enum(['paid_test', 'creatives', 'winner', 'contingency']);
export type BudgetCategory = z.infer<typeof BudgetCategory>;
export const BUDGET_LABELS: Record<BudgetCategory, string> = {
  paid_test: 'Paid test',
  creatives: 'Creatives',
  winner: 'Winner',
  contingency: 'Contingency',
};

// ---------- Stored entities ----------

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const isoTs = z.string().datetime({ offset: true });

export const UserRecord = z.object({
  id: z.string(),
  role: Role,
  name: z.string(),
  email: z.string(),
  email_normalized: z.string(),
  // null for fictional seed accounts that cannot sign in
  password_hash: z.string().nullable(),
  password_salt: z.string().nullable(),
  password_iterations: z.number().int(),
  created_at: isoTs,
  fictional: z.boolean(),
});
export type UserRecord = z.infer<typeof UserRecord>;

export const ObservedAttribution = z.object({
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
  ref: z.string().max(40).optional(),
});
export type ObservedAttribution = z.infer<typeof ObservedAttribution>;

export const RegistrationRecord = z.object({
  id: z.string(),
  user_id: z.string(),
  college: z.string(),
  branch: z.string(),
  year: z.enum(YEARS),
  city: z.string().optional(),
  state: z.string().optional(),
  consent: z.boolean(),
  self_reported_source: SelfReportedSource,
  observed: ObservedAttribution,
  ref_code_entered: z.string().optional(),
  ref_status: RefStatus,
  ref_code_id: z.string().optional(),
  status: RegistrationStatus,
  deletion_requested: z.boolean(),
  created_at: isoTs,
  fictional: z.boolean(),
});
export type RegistrationRecord = z.infer<typeof RegistrationRecord>;

export const ReferralCodeRecord = z.object({
  id: z.string(),
  code: z.string(),
  owner_type: OwnerType,
  owner_user_id: z.string().optional(),
  owner_label: z.string(),
  owner_email_normalized: z.string().optional(),
  status: z.enum(['active', 'paused']),
  created_at: isoTs,
  fictional: z.boolean(),
});
export type ReferralCodeRecord = z.infer<typeof ReferralCodeRecord>;

export const EventRecord = z.object({
  id: z.string(),
  type: EventType,
  session_id: z.string(),
  ts: isoTs,
  ref: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  fictional: z.boolean(),
});
export type EventRecord = z.infer<typeof EventRecord>;

export const SuggestionRecord = z.object({
  id: z.string(),
  user_id: z.string(),
  idea: z.string(),
  category: SuggestionCategory,
  description: z.string(),
  contact_preference: ContactPreference,
  status: SuggestionStatus,
  admin_response: z.string().optional(),
  created_at: isoTs,
  updated_at: isoTs,
  fictional: z.boolean(),
});
export type SuggestionRecord = z.infer<typeof SuggestionRecord>;

export const AuditRecord = z.object({
  id: z.string(),
  actor_user_id: z.string(),
  action: z.string(),
  target_id: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  note: z.string().optional(),
  ts: isoTs,
});
export type AuditRecord = z.infer<typeof AuditRecord>;

export const SpendRecord = z.object({
  id: z.string(),
  date: isoDate,
  category: BudgetCategory,
  amount: z.number().positive(),
  note: z.string().optional(),
});
export type SpendRecord = z.infer<typeof SpendRecord>;

export const CampaignSettings = z.object({
  name: z.string().min(3).max(120),
  target: z.number().int().min(1).max(100000),
  start_date: isoDate,
  end_date: isoDate,
  daily_targets: z.array(z.number().int().min(0)),
  sources: z.array(SelfReportedSource).min(1),
  planned_budget: z.array(z.object({ category: BudgetCategory, amount: z.number().min(0) })),
  actual_spend: z.array(SpendRecord),
  whatsapp_url: z.string().optional(),
});
export type CampaignSettings = z.infer<typeof CampaignSettings>;

export const SessionRecord = z.object({
  token: z.string(),
  user_id: z.string(),
  role: Role,
  created_at: isoTs,
  expires_at: isoTs,
});
export type SessionRecord = z.infer<typeof SessionRecord>;

export const SCHEMA_VERSION = 1;

export const StoreState = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  seededAt: isoTs,
  users: z.array(UserRecord),
  registrations: z.array(RegistrationRecord),
  referralCodes: z.array(ReferralCodeRecord),
  events: z.array(EventRecord),
  suggestions: z.array(SuggestionRecord),
  audit: z.array(AuditRecord),
  sessions: z.array(SessionRecord),
  settings: CampaignSettings,
});
export type StoreState = z.infer<typeof StoreState>;

// ---------- Form / service inputs ----------

const password = z
  .string()
  .min(8, 'At least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Include a letter')
  .regex(/[0-9]/, 'Include a number');

const name = z.string().trim().min(2, 'Enter your full name').max(80);
const college = z.string().trim().min(2, 'Enter your college').max(120);
const optionalText = z.string().trim().max(80).optional().or(z.literal('').transform(() => undefined));

export const RegisterInput = z
  .object({
    name,
    email: z.string().trim().email('Enter a valid email').max(254),
    password,
    confirmPassword: z.string(),
    college,
    branch: z.string().min(1, 'Choose your branch'),
    year: z.enum(YEARS, { errorMap: () => ({ message: 'Choose your year' }) }),
    city: optionalText,
    state: optionalText,
    consent: z.literal(true, { errorMap: () => ({ message: 'Consent is required to register' }) }),
    self_reported_source: SelfReportedSource,
    referral_code: z
      .string()
      .trim()
      .max(40)
      .transform((v) => (v === '' ? undefined : v.toUpperCase()))
      .optional(),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterInput = z.input<typeof RegisterInput>;

export const LoginInput = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const ResetPasswordInput = z
  .object({
    email: z.string().trim().email('Enter a valid email'),
    college,
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ResetPasswordInput = z.input<typeof ResetPasswordInput>;

export const ChangePasswordInput = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.input<typeof ChangePasswordInput>;

// Strict: role, email and anything else not listed here are rejected outright.
export const StudentProfilePatch = z
  .object({
    name,
    college,
    branch: z.string().min(1),
    year: z.enum(YEARS),
    city: optionalText,
    state: optionalText,
  })
  .partial()
  .strict();
export type StudentProfilePatch = z.input<typeof StudentProfilePatch>;

export const AdminProfilePatch = z.object({ name }).strict();

export const SuggestionInput = z
  .object({
    idea: z.string().trim().min(5, 'At least 5 characters').max(100, 'At most 100 characters'),
    category: SuggestionCategory,
    description: z.string().trim().min(10, 'At least 10 characters').max(1000, 'At most 1000 characters'),
    contact_preference: ContactPreference,
  })
  .strict();
export type SuggestionInput = z.input<typeof SuggestionInput>;

export const SuggestionResponseInput = z
  .object({
    status: SuggestionStatus,
    admin_response: z.string().trim().max(1000).optional(),
  })
  .strict();

export const ReferralCodeInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{4,24}$/, '4–24 characters: letters, numbers, hyphens'),
    owner_type: z.enum(['ambassador', 'club']),
    owner_label: z.string().trim().min(2).max(80),
    owner_email: z.string().trim().email().optional().or(z.literal('').transform(() => undefined)),
  })
  .strict();
export type ReferralCodeInput = z.input<typeof ReferralCodeInput>;

export const RegistrationStatusInput = z
  .object({ status: RegistrationStatus, note: z.string().trim().max(300).optional() })
  .strict();

export const WHATSAPP_URL = z
  .string()
  .trim()
  .url()
  .refine((u) => {
    const { protocol, hostname } = new URL(u);
    return protocol === 'https:' && ['chat.whatsapp.com', 'whatsapp.com', 'www.whatsapp.com'].includes(hostname);
  }, 'Must be an https://chat.whatsapp.com/… invite link');

export const CampaignSettingsPatch = z
  .object({
    name: z.string().trim().min(3).max(120),
    target: z.number().int().min(1).max(100000),
    start_date: isoDate,
    end_date: isoDate,
    daily_targets: z.array(z.number().int().min(0).max(100000)),
    sources: z.array(SelfReportedSource).min(1),
    planned_budget: z.array(z.object({ category: BudgetCategory, amount: z.number().min(0).max(10000000) })),
    whatsapp_url: WHATSAPP_URL.optional().or(z.literal('').transform(() => undefined)),
  })
  .partial()
  .strict();
export type CampaignSettingsPatch = z.input<typeof CampaignSettingsPatch>;

export const SpendInput = z
  .object({
    date: isoDate,
    category: BudgetCategory,
    amount: z.number().positive('Must be more than 0').max(10000000),
    note: z.string().trim().max(200).optional(),
  })
  .strict();
export type SpendInput = z.input<typeof SpendInput>;

export const TrackEventInput = z
  .object({
    type: EventType,
    session_id: z.string().min(8).max(64),
    ref: z.string().max(40).optional(),
    utm_source: z.string().max(100).optional(),
    utm_medium: z.string().max(100).optional(),
    utm_campaign: z.string().max(100).optional(),
  })
  .strict();
export type TrackEventInput = z.input<typeof TrackEventInput>;
