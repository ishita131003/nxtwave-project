import { useState, type FormEvent } from 'react';
import { dataSource } from '../../api';
import type { Session } from '../../api/dataSource';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Feedback';
import { TextField } from '../ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';

export function ChangePassword({ session }: { session: Session }) {
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    const ok = await run(async () => {
      await dataSource.changePassword(session, form);
      return true;
    });
    if (ok) {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setDone(true);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <Notice tone="error">{error}</Notice>}
      {done && <Notice tone="success">Password changed. Other sessions for this account were signed out.</Notice>}
      <TextField label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={fieldErrors.currentPassword} />
      <TextField label="New password" type="password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={fieldErrors.newPassword} hint="8+ characters with a letter and a number" />
      <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={fieldErrors.confirmPassword} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Saving…' : 'Change password'}
      </Button>
    </form>
  );
}
