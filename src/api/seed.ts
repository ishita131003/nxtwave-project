// Fictional demo data. Every record is marked fictional: true. Names, emails and colleges are
// invented. The hand-computed KPIs for this seed live in tests/fixtures/expected.json.
import { addDays, istTimestamp } from '../lib/dates';
import { aliasKey, normalizeEmail } from '../lib/email';
import {
  SCHEMA_VERSION,
  SELF_REPORTED_SOURCES,
  type EventRecord,
  type EventType,
  type ReferralCodeRecord,
  type RegistrationRecord,
  type SelfReportedSource,
  type StoreState,
  type SuggestionRecord,
  type UserRecord,
} from '../lib/schema';

export const DEMO_STUDENT = { email: 'student.demo@example.com', password: 'StudentDemo@123' };
export const DEMO_ADMIN = { email: 'admin.demo@example.com', password: 'AdminDemo@123' };

export interface StoredHash {
  hash: string;
  salt: string;
  iterations: number;
}

const COLLEGES = {
  SIT: 'Sahyadri Institute of Technology (fictional)',
  KCE: 'Kaveri College of Engineering (fictional)',
  NEC: 'Narmada Engineering College (fictional)',
  DIE: 'Deccan Institute of Engineering (fictional)',
  GTI: 'Godavari Technical Institute (fictional)',
} as const;

type Row = [
  id: string,
  name: string,
  email: string,
  college: keyof typeof COLLEGES,
  branch: string,
  year: RegistrationRecord['year'],
  day: number, // campaign day 1..7
  time: string, // IST HH:MM
  self: SelfReportedSource,
  utm: string | null,
  ref: string | null,
  status: RegistrationRecord['status'],
  studentCode: string,
];

// prettier-ignore
const ROWS: Row[] = [
  ['r01', 'Demo Student',     'student.demo@example.com',  'SIT', 'CSE',        '4', 1, '09:10', 'whatsapp',        'whatsapp',  null,              'verified',   'STU-DEMO01'],
  ['r02', 'Ananya Rao',       'ananya.rao@example.com',    'KCE', 'CSE',        '4', 1, '11:20', 'ambassador_club', 'ambassador','AMB-KAVERI',      'verified',   'STU-ANRA02'],
  ['r03', 'Karthik Nair',     'karthik.nair@example.com',  'KCE', 'IT',         '4', 1, '15:05', 'ambassador_club', 'ambassador','AMB-KAVERI',      'registered', 'STU-KANA03'],
  ['r04', 'Meera Joshi',      'meera.joshi@example.com',   'NEC', 'ECE',        '4', 1, '20:40', 'whatsapp',        null,        null,              'registered', 'STU-MEJO04'],
  ['r05', 'Rohan Gupta',      'rohan.gupta@example.com',   'SIT', 'CSE',        '4', 2, '10:00', 'friend',          'whatsapp',  'STU-DEMO01',      'verified',   'STU-ROGU05'],
  ['r06', 'Sneha Patil',      'sneha.patil@example.com',   'NEC', 'AI & DS',    '4', 2, '12:30', 'ambassador_club', 'club',      'CLUB-AIML-NEC',   'registered', 'STU-SNPA06'],
  ['r07', 'Arjun Reddy',      'arjun.reddy@example.com',   'NEC', 'CSE',        '4', 2, '16:45', 'ambassador_club', 'club',      'CLUB-AIML-NEC',   'registered', 'STU-ARRE07'],
  ['r08', 'Priya Menon',      'priya.menon@example.com',   'DIE', 'IT',         '3', 2, '21:15', 'instagram',       'instagram', null,              'registered', 'STU-PRME08'],
  ['r09', 'Vikram Singh',     'vikram.singh@example.com',  'SIT', 'ECE',        '4', 3, '09:50', 'friend',          'whatsapp',  'STU-DEMO01',      'registered', 'STU-VISI09'],
  ['r10', 'Riya Sharma',      'riya.sharma@gmail.com',     'GTI', 'CSE',        '4', 3, '11:05', 'whatsapp',        'whatsapp',  null,              'verified',   'STU-RIYA22'],
  ['r11', 'Aditya Kumar',     'aditya.kumar@example.com',  'DIE', 'CSE',        '4', 3, '14:25', 'ambassador_club', 'club',      'CLUB-CODERS-DIE', 'registered', 'STU-ADKU11'],
  ['r12', 'Neha Verma',       'neha.verma@example.com',    'KCE', 'ECE',        '4', 3, '18:10', 'linkedin',        'linkedin',  null,              'registered', 'STU-NEVE12'],
  ['r13', 'Test Entry',       'asdf@mailinator.com',       'GTI', 'Mechanical', '4', 3, '23:30', 'other',           null,        null,              'rejected',   'STU-TEEN13'],
  ['r14', 'Ishaan Das',       'ishaan.das@example.com',    'KCE', 'CSE',        '4', 4, '10:15', 'ambassador_club', 'ambassador','AMB-KAVERI',      'registered', 'STU-ISDA14'],
  ['r15', 'Kavya Iyer',       'kavya.iyer@example.com',    'NEC', 'IT',         '4', 4, '13:40', 'friend',          null,        'XYZ-FAKE1',       'registered', 'STU-KAIY15'],
  ['r16', 'Riya S.',          'riyasharma+ai@gmail.com',   'GTI', 'CSE',        '4', 4, '17:00', 'friend',          'referral',  'STU-RIYA22',      'registered', 'STU-RISS16'],
  ['r17', 'Farhan Ali',       'farhan.ali@example.com',    'DIE', 'ECE',        '4', 4, '19:55', 'ambassador_club', 'club',      'CLUB-CODERS-DIE', 'registered', 'STU-FAAL17'],
  ['r18', 'Pooja Bhat',       'pooja.bhat@example.com',    'SIT', 'IT',         '4', 5, '09:30', 'whatsapp',        'whatsapp',  'STU-DEMO01',      'registered', 'STU-POBH18'],
  ['r19', 'Siddharth Jain',   'siddharth.jain@example.com','NEC', 'CSE',        '4', 5, '12:00', 'ambassador_club', 'club',      'CLUB-AIML-NEC',   'registered', 'STU-SIJA19'],
  ['r20', 'Tanvi Kulkarni',   'tanvi.kulkarni@example.com','KCE', 'AI & DS',    '3', 5, '15:35', 'instagram',       'facebook',  null,              'registered', 'STU-TAKU20'],
  ['r21', 'Rahul Mehta',      'rahul.mehta@gmail.com',     'GTI', 'EEE',        '4', 5, '20:20', 'facebook',        'facebook',  null,              'registered', 'STU-RAME21'],
  ['r22', 'Rahul M.',         'rahulmehta@gmail.com',      'GTI', 'EEE',        '4', 6, '08:45', 'other',           null,        null,              'registered', 'STU-RAMM22'],
  ['r23', 'Divya Pillai',     'divya.pillai@example.com',  'KCE', 'CSE',        '4', 6, '13:10', 'ambassador_club', 'ambassador','AMB-KAVERI',      'registered', 'STU-DIPI23'],
  ['r24', 'Manish Yadav',     'manish.yadav@example.com',  'DIE', 'IT',         '4', 6, '18:30', 'friend',          'referral',  'STU-RIYA22',      'registered', 'STU-MAYA24'],
  ['r25', 'Lakshmi Krishnan', 'lakshmi.k@example.com',     'SIT', 'CSE',        '4', 7, '00:05', 'linkedin',        'linkedin',  null,              'registered', 'STU-LAKR25'],
  ['r26', 'Nikhil Shetty',    'nikhil.shetty@example.com', 'NEC', 'ECE',        '4', 7, '00:20', 'ambassador_club', 'club',      'CLUB-AIML-NEC',   'registered', 'STU-NISH26'],
];

const STAFF_CODES: { id: string; code: string; owner_type: 'ambassador' | 'club'; owner_label: string; owner_email?: string }[] = [
  { id: 'code_amb_kaveri', code: 'AMB-KAVERI', owner_type: 'ambassador', owner_label: 'Ambassador · Kaveri CoE (fictional)', owner_email: 'kaveri.ambassador@example.com' },
  { id: 'code_club_aiml', code: 'CLUB-AIML-NEC', owner_type: 'club', owner_label: 'AI/ML Club · Narmada EC (fictional)' },
  { id: 'code_club_coders', code: 'CLUB-CODERS-DIE', owner_type: 'club', owner_label: 'Coders Club · Deccan IE (fictional)' },
];

// Extra link opens that did not lead to a registration: code → campaign days.
const EXTRA_OPENS: Record<string, number[]> = {
  'AMB-KAVERI': [1, 1, 2, 3, 4, 6],
  'CLUB-AIML-NEC': [2, 2, 2, 3, 4, 5, 6, 7],
  'CLUB-CODERS-DIE': [3, 3, 3, 4, 5, 6],
  'STU-DEMO01': [2, 3, 5],
  'STU-RIYA22': [6],
};
const REF_BOUNCES_WITH_REGISTER_VIEW = 8; // first N of the extra-open sessions also viewed /register
const PLAIN_BOUNCES = 30; // landing-only sessions with no ref
const PLAIN_BOUNCES_WITH_REGISTER_VIEW = 10;

export const DEFAULT_DAILY_TARGETS = [40, 55, 65, 75, 85, 90, 90];

export function buildSeed(anchorDay: string, hashes: { student: StoredHash; admin: StoredHash }, seededAt: string): StoreState {
  const start = addDays(anchorDay, -6);
  const dayOf = (n: number) => addDays(start, n - 1);
  const ts = (n: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return istTimestamp(dayOf(n), h, m);
  };
  const codeIdByCode = new Map<string, string>(STAFF_CODES.map((c) => [c.code, c.id]));
  for (const r of ROWS) codeIdByCode.set(r[12], `code_${r[0]}`);

  const users: UserRecord[] = [
    {
      id: 'u_admin',
      role: 'admin',
      name: 'Demo Admin',
      email: DEMO_ADMIN.email,
      email_normalized: DEMO_ADMIN.email,
      password_hash: hashes.admin.hash,
      password_salt: hashes.admin.salt,
      password_iterations: hashes.admin.iterations,
      created_at: ts(1, '08:00'),
      fictional: true,
    },
  ];
  const registrations: RegistrationRecord[] = [];
  const referralCodes: ReferralCodeRecord[] = STAFF_CODES.map((c) => ({
    id: c.id,
    code: c.code,
    owner_type: c.owner_type,
    owner_label: c.owner_label,
    owner_email_normalized: c.owner_email,
    status: 'active',
    created_at: ts(1, '08:00'),
    fictional: true,
  }));
  const events: EventRecord[] = [];
  let eventSeq = 0;
  const event = (type: EventType, session: string, at: string, extra: Partial<EventRecord> = {}) =>
    events.push({ id: `seed_e${String(++eventSeq).padStart(3, '0')}`, type, session_id: session, ts: at, fictional: true, ...extra });

  for (const [id, name, email, college, branch, year, day, time, self, utm, ref, status, studentCode] of ROWS) {
    const isDemo = email === DEMO_STUDENT.email;
    const created = ts(day, time);
    const userId = `u_${id}`;
    users.push({
      id: userId,
      role: 'student',
      name,
      email,
      email_normalized: normalizeEmail(email),
      password_hash: isDemo ? hashes.student.hash : null,
      password_salt: isDemo ? hashes.student.salt : null,
      password_iterations: isDemo ? hashes.student.iterations : 0,
      created_at: created,
      fictional: true,
    });
    const refCodeId = ref ? codeIdByCode.get(ref) : undefined;
    const refOwner = ROWS.find((r) => r[12] === ref);
    const refStatus: RegistrationRecord['ref_status'] = !ref
      ? 'none'
      : !refCodeId
        ? 'invalid_ref'
        : refOwner && aliasKey(refOwner[2]) === aliasKey(email)
          ? 'rejected_self'
          : 'valid';
    registrations.push({
      id: `reg_${id}`,
      user_id: userId,
      college: COLLEGES[college],
      branch,
      year,
      consent: true,
      self_reported_source: self,
      observed: { ...(utm ? { utm_source: utm, utm_medium: ref ? 'referral' : 'social', utm_campaign: 'ai60' } : {}), ...(ref ? { ref } : {}) },
      ref_code_entered: ref ?? undefined,
      ref_status: refStatus,
      ref_code_id: refStatus === 'valid' ? refCodeId : undefined,
      status,
      deletion_requested: false,
      created_at: created,
      fictional: true,
    });
    referralCodes.push({
      id: `code_${id}`,
      code: studentCode,
      owner_type: 'student',
      owner_user_id: userId,
      owner_label: `Student · ${name}`,
      owner_email_normalized: normalizeEmail(email),
      status: 'active',
      created_at: created,
      fictional: true,
    });

    const session = `seed_s_${id}`;
    const landingAt = new Date(Date.parse(created) - 6 * 60 * 1000).toISOString();
    const viewAt = new Date(Date.parse(created) - 4 * 60 * 1000).toISOString();
    const utmFields = utm ? { utm_source: utm, utm_medium: ref ? 'referral' : 'social', utm_campaign: 'ai60' } : {};
    if (ref) event('ref_link_open', session, landingAt, { ref, ...utmFields });
    event('landing_view', session, landingAt, { ...(ref ? { ref } : {}), ...utmFields });
    event('register_view', session, viewAt);
    event('register_success', session, created);
  }

  let bounce = 0;
  for (const [code, days] of Object.entries(EXTRA_OPENS)) {
    days.forEach((day, i) => {
      const session = `seed_s_ref_${code}_${i}`;
      const at = ts(day, `${String(10 + (i % 10)).padStart(2, '0')}:30`);
      event('ref_link_open', session, at, { ref: code, utm_source: 'referral', utm_campaign: 'ai60' });
      event('landing_view', session, at, { ref: code, utm_source: 'referral', utm_campaign: 'ai60' });
      if (bounce++ < REF_BOUNCES_WITH_REGISTER_VIEW) event('register_view', session, at);
    });
  }
  for (let i = 0; i < PLAIN_BOUNCES; i++) {
    const session = `seed_s_plain_${i}`;
    const at = ts((i % 7) + 1, `${String(9 + (i % 12)).padStart(2, '0')}:15`);
    event('landing_view', session, at);
    if (i < PLAIN_BOUNCES_WITH_REGISTER_VIEW) event('register_view', session, at);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    seededAt,
    users,
    registrations,
    referralCodes,
    events: events.sort((a, b) => a.ts.localeCompare(b.ts) || a.id.localeCompare(b.id)),
    suggestions: buildSuggestions(ts),
    audit: [
      {
        id: 'seed_a1',
        actor_user_id: 'u_admin',
        action: 'registration.status',
        target_id: 'reg_r13',
        from: 'registered',
        to: 'rejected',
        note: 'Disposable email, placeholder name (fictional example)',
        ts: ts(4, '09:00'),
      },
    ],
    sessions: [],
    settings: {
      name: 'Build Your First AI Project in 60 Minutes',
      target: 500,
      start_date: start,
      end_date: anchorDay,
      daily_targets: [...DEFAULT_DAILY_TARGETS],
      sources: [...SELF_REPORTED_SOURCES],
      planned_budget: [
        { category: 'paid_test', amount: 800 },
        { category: 'creatives', amount: 400 },
        { category: 'winner', amount: 600 },
        { category: 'contingency', amount: 200 },
      ],
      actual_spend: [],
      whatsapp_url: undefined,
    },
  };
}

function buildSuggestions(ts: (day: number, hhmm: string) => string): SuggestionRecord[] {
  const s = (
    id: string,
    user: string,
    day: number,
    idea: string,
    category: SuggestionRecord['category'],
    description: string,
    status: SuggestionRecord['status'],
    admin_response?: string,
  ): SuggestionRecord => ({
    id: `seed_sg${id}`,
    user_id: user,
    idea,
    category,
    description,
    contact_preference: 'in_app',
    status,
    admin_response,
    created_at: ts(day, '12:00'),
    updated_at: ts(Math.min(day + 1, 7), '12:00'),
    fictional: true,
  });
  return [
    s('1', 'u_r01', 2, 'Short WhatsApp-friendly poster', 'campaign_idea', 'A square image with the workshop name works better in class groups than a long message.', 'planned', 'Good call — a downloadable campaign card is on the Referral page now.'),
    s('2', 'u_r01', 4, 'Show which laptop setup I need', 'workshop_topic', 'Please list what to install beforehand so beginners do not lose the first 10 minutes.', 'reviewing'),
    s('3', 'u_r05', 3, 'Hindi explainer message', 'campaign_idea', 'Some of my classmates would share a Hindi version of the invite more readily.', 'new'),
    s('4', 'u_r08', 3, 'Dark mode for the portal', 'student_experience', 'Reading the dashboard at night is hard on the eyes. A dark theme would help.', 'declined', 'Not planned for this prototype; thanks for the idea.'),
    s('5', 'u_r11', 4, 'Copy link button did nothing', 'technical_issue', 'On my phone the copy button inside WhatsApp did not copy. The share button worked.', 'completed', 'Thanks — inside WhatsApp, use the Share button; some in-app browsers block clipboard access.'),
    s('6', 'u_r12', 5, 'Topic: using AI APIs safely', 'workshop_topic', 'A five-minute section on keeping API keys out of code would be useful for beginners.', 'new'),
    s('7', 'u_r19', 6, 'Club leaderboard', 'campaign_idea', 'Clubs would push harder if they could see where they rank against other colleges.', 'reviewing'),
    s('8', 'u_r24', 6, 'Reminder before the session', 'other', 'A reminder message the day before would help people actually attend.', 'new'),
  ];
}
