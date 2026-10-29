import { KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { dataSource } from '../../api';
import { DEMO_ADMIN, DEMO_STUDENT } from '../../api/seed';
import { parse } from '../../api/errors';
import { Button, buttonClass } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Feedback';
import { TextField } from '../../components/ui/Field';
import { useAsyncAction } from '../../hooks/useAsyncAction';
import { useAuth } from '../../hooks/useAuth';
import { LoginInput, type Role } from '../../lib/schema';

const HOME: Record<Role, string> = { student: '/student/dashboard', admin: '/admin/dashboard' };

export default function Login({ portal }: { portal: Role }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { refresh } = useAuth();
  const { pending, error, fieldErrors, run } = useAsyncAction();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const demo = portal === 'admin' ? DEMO_ADMIN : DEMO_STUDENT;
  const from = (location.state as { from?: string } | null)?.from;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const session = await run(async () => {
      const data = parse(LoginInput, { email, password });
      return dataSource.login(data.email, data.password, portal);
    });
    if (session) {
      refresh();
      navigate(from?.startsWith(portal === 'admin' ? '/admin/' : '/student/') ? from : HOME[portal], { replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-4 sm:py-6">
      <div className="sheet relative px-5 pt-7 pb-4 sm:px-8">
        <span className="pin" aria-hidden />
      <h1 className="display text-4xl text-ink">{portal === 'admin' ? 'Admin log in' : 'Student log in'}</h1>
      <p className="mt-1 text-sm text-ink/75">
        {portal === 'admin' ? (
          'For the campaign team. Student accounts cannot sign in here.'
        ) : (
          <>
            New here?{' '}
            <Link to="/register" className="font-semibold text-brand-800 underline">
              Register for the workshop
            </Link>
          </>
        )}
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-4 space-y-3">
        {params.get('expired') && <Notice tone="warning">Your session expired after 8 hours. Please log in again.</Notice>}
        {error && <Notice tone="error">{error}</Notice>}
        <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Checking…' : 'Log in'}
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {portal === 'student' ? (
            <Link to="/forgot-password" className="font-medium text-brand-800 underline">
              Forgot password?
            </Link>
          ) : (
            <Link to="/login" className="font-medium text-brand-800 underline">
              Student log in
            </Link>
          )}
          {portal === 'student' && (
            <Link to="/admin/login" className={buttonClass('secondary', 'px-3 text-sm')}>
              Admin log in
            </Link>
          )}
        </div>
      </form>

      <div className="mt-4 bg-lemon p-3 text-sm text-ink">
        <p className="font-mono text-xs font-bold tracking-wide">DEMO CREDENTIALS</p>
        <p className="mt-1">
          <span className="font-mono">{demo.email}</span>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          <span className="font-mono">{demo.password}</span>
        </p>
        <Button
          variant="secondary"
          className="mt-2"
          onClick={() => {
            setEmail(demo.email);
            setPassword(demo.password);
          }}
        >
          <KeyRound aria-hidden className="h-4 w-4" /> Use demo credentials
        </Button>
      </div>
      </div>
    </div>
  );
}
