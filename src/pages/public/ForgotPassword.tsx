import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { dataSource } from '../../api';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export default function ForgotPassword() {
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ email: '', college: '', newPassword: '', confirmPassword: '' });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await run(async () => {
      await dataSource.resetPasswordLocal(form);
      return true;
    });
    if (ok) setDone(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-8">
      <div className="sheet relative px-5 pt-9 pb-6 sm:px-8">
        <span className="pin" aria-hidden />
      <h1 className="display text-4xl text-ink">Reset your password</h1>
      <div className="mt-4">
        <Notice tone="warning" title="Demo mode: no email can be sent">
          This prototype has no server, so there is no reset email. Instead, confirm the email and the college you registered with, then
          choose a new password. A real system would never reset a password this way.
        </Notice>
      </div>
      {done ? (
        <div className="mt-6 space-y-4">
          <Notice tone="success">Password updated. Other signed-in sessions for this account were signed out.</Notice>
          <Link to="/login" className="font-semibold text-brand-800 underline">
            Go to log in
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
          {error && <Notice tone="error">{error}</Notice>}
          <TextField label="Email you registered with" type="email" autoComplete="username" value={form.email} onChange={set('email')} error={fieldErrors.email} />
          <TextField label="College you registered with" value={form.college} onChange={set('college')} error={fieldErrors.college} />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={set('newPassword')}
            error={fieldErrors.newPassword}
            hint="8+ characters with a letter and a number"
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            error={fieldErrors.confirmPassword}
          />
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Updating…' : 'Set new password'}
          </Button>
        </form>
      )}
      </div>
    </div>
  );
}
