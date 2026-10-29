import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataSource } from '../../api';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Feedback';
import { CheckboxField, SelectField, TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth } from '../../hooks/useAuth';
import { getAnonSessionId, readAttribution } from '../../lib/attribution';
import { BRANCHES, SELF_REPORTED_SOURCES, SOURCE_LABELS, YEAR_LABELS, YEARS, type SelfReportedSource } from '../../lib/schema';
import { usePublicCampaign } from '../../hooks/useStudent';

const SELF_REPORTED_LABEL = (s: SelfReportedSource) =>
  s === 'friend' ? 'A friend' : s === 'ambassador_club' ? 'College ambassador or club' : SOURCE_LABELS[s];

export default function Register() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const attribution = useRef(readAttribution(window.sessionStorage));
  const tracked = useRef(false);
  const campaign = usePublicCampaign();
  const offered = SELF_REPORTED_SOURCES.filter((s) => campaign.data?.sources.includes(s) ?? true);
  const [codeCheck, setCodeCheck] = useState<'unknown' | 'valid' | 'invalid'>('unknown');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: '',
    branch: '',
    year: '',
    city: '',
    state: '',
    consent: false,
    self_reported_source: '',
    referral_code: attribution.current.ref ?? '',
  });

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    const a = attribution.current;
    void dataSource.trackEvent({
      type: 'register_view',
      session_id: getAnonSessionId(window.sessionStorage),
      ref: a.ref,
      utm_source: a.utm_source,
      utm_medium: a.utm_medium,
      utm_campaign: a.utm_campaign,
    });
    if (a.ref) void checkCode(a.ref);
  }, []);

  async function checkCode(code: string) {
    if (!code.trim()) return setCodeCheck('unknown');
    const { exists } = await dataSource.lookupReferralCode(code);
    setCodeCheck(exists ? 'valid' : 'invalid');
  }

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const result = await run(() =>
      dataSource.register(form as Parameters<typeof dataSource.register>[0], {
        observed: attribution.current,
        anonSessionId: getAnonSessionId(window.sessionStorage),
      }),
    );
    if (result) {
      refresh();
      navigate('/student/dashboard', { state: { justRegistered: true, refStatus: result.refStatus, enteredCode: form.referral_code } });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="sheet relative px-5 pt-9 pb-6 sm:px-8">
        <span className="pin" aria-hidden />
      <h1 className="display text-4xl text-ink sm:text-5xl">Register for the workshop</h1>
      <p className="mt-1 text-sm text-ink/75">
        Free · online · beginner-friendly. Already registered?{' '}
        <Link to="/login" className="font-semibold text-brand-800 underline">
          Log in
        </Link>
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
        {error && (
          <Notice tone="error">
            {error}
            {fieldErrors.email === 'This email is already registered.' && (
              <>
                {' '}
                <Link to="/login" className="font-semibold underline">
                  Go to log in
                </Link>
              </>
            )}
          </Notice>
        )}
        <TextField label="Full name" autoComplete="name" value={form.name} onChange={set('name')} error={fieldErrors.name} required />
        <TextField
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email}
          onChange={set('email')}
          error={fieldErrors.email}
          required
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={fieldErrors.password}
            hint="8+ characters with a letter and a number"
            required
          />
          <TextField
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={fieldErrors.confirmPassword}
            required
          />
        </div>
        <TextField label="College" autoComplete="organization" value={form.college} onChange={set('college')} error={fieldErrors.college} required />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label="Branch"
            value={form.branch}
            onChange={set('branch')}
            error={fieldErrors.branch}
            placeholder="Choose…"
            options={BRANCHES.map((b) => ({ value: b, label: b }))}
            required
          />
          <SelectField
            label="Year"
            value={form.year}
            onChange={set('year')}
            error={fieldErrors.year}
            placeholder="Choose…"
            options={YEARS.map((y) => ({ value: y, label: YEAR_LABELS[y] }))}
            required
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label="City" optional autoComplete="address-level2" value={form.city} onChange={set('city')} error={fieldErrors.city} />
          <TextField label="State" optional autoComplete="address-level1" value={form.state} onChange={set('state')} error={fieldErrors.state} />
        </div>
        <SelectField
          label="How did you hear about this?"
          value={form.self_reported_source}
          onChange={set('self_reported_source')}
          error={fieldErrors.self_reported_source && 'Tell us where you heard about it'}
          placeholder="Choose…"
          options={offered.map((s) => ({ value: s, label: SELF_REPORTED_LABEL(s) }))}
          required
        />
        <TextField
          label="Referral code"
          optional
          autoCapitalize="characters"
          value={form.referral_code}
          onChange={(e) => {
            set('referral_code')(e);
            setCodeCheck('unknown');
          }}
          onBlur={(e) => void checkCode(e.target.value)}
          error={codeCheck === 'invalid' ? "We don't recognise this code. You can still register, but nobody will get credit for referring you." : fieldErrors.referral_code}
          hint={codeCheck === 'valid' ? 'Code recognised.' : attribution.current.ref ? 'Filled in from the link you opened.' : undefined}
        />
        <CheckboxField
          label="I agree to be contacted about this workshop and for my registration details to be stored for running it. (Demo: data stays in this browser.)"
          checked={form.consent}
          onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
          error={fieldErrors.consent}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Registering…' : 'Register'}
        </Button>
      </form>
      </div>
    </div>
  );
}
