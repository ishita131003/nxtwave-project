import { ShieldAlert } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { dataSource } from '../../api';
import type { Role } from '../../lib/schema';
import { useAuth } from '../../hooks/useAuth';
import { buttonClass } from '../ui/Button';
import { DemoBanner } from './Chrome';

const LOGIN: Record<Role, string> = { student: '/login', admin: '/admin/login' };
const HOME: Record<Role, string> = { student: '/student/dashboard', admin: '/admin/dashboard' };

/**
 * UX only: sends people to the right login page or explains why they can't see a page.
 * The real gate is the service layer, which re-checks the session and role on every call.
 */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { current } = useAuth();
  const location = useLocation();
  const expired = current.status === 'expired';

  useEffect(() => {
    if (expired) dataSource.clearCurrentSession();
  }, [expired]);

  if (current.status === 'expired') {
    return <Navigate to={`${LOGIN[current.role]}?expired=1`} replace state={{ from: location.pathname }} />;
  }
  if (current.status === 'none') return <Navigate to={LOGIN[role]} replace state={{ from: location.pathname }} />;
  if (current.session.role !== role) return <Forbidden home={HOME[current.session.role]} needed={role} />;
  return <>{children}</>;
}

function Forbidden({ home, needed }: { home: string; needed: Role }) {
  return (
    <div className="min-h-screen">
      <DemoBanner />
      <main id="main" className="mx-auto max-w-md px-4 py-16 text-center">
        <ShieldAlert aria-hidden className="mx-auto h-10 w-10 text-red-700" />
        <h1 className="mt-3 text-xl font-bold text-ink">{needed === 'admin' ? 'Admins only' : 'Students only'}</h1>
        <p className="mt-2 text-sm text-ink/75">Your account can't open this page.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to={home} className={buttonClass('primary')}>
            Back to my dashboard
          </Link>
          <Link to={LOGIN[needed]} className={buttonClass('secondary')}>
            {needed === 'admin' ? 'Admin log in' : 'Student log in'}
          </Link>
        </div>
      </main>
    </div>
  );
}
