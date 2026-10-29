import { Link, Outlet } from 'react-router-dom';
import { buttonClass } from '../ui/Button';
import { Brand, DemoBanner, Footer } from './Chrome';
import { useAuth } from '../../hooks/useAuth';

/** Public pages are the board itself: felt edge to edge, content pinned on as sheets. */
export function PublicLayout() {
  const { session } = useAuth();
  return (
    <div className="felt flex min-h-screen flex-col">
      <DemoBanner />
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3">
          <Brand />
          <nav aria-label="Account" className="flex items-center gap-1">
            <Link className="flex min-h-11 items-center px-3 text-[15px] font-bold whitespace-nowrap text-white underline decoration-white/40 hover:decoration-white" to="/">
              Home
            </Link>
            {session ? (
              <Link className={buttonClass('lemon', 'whitespace-nowrap px-3')} to={session.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
                My dashboard
              </Link>
            ) : (
              <>
                <Link className="flex min-h-11 items-center px-3 text-[15px] font-bold whitespace-nowrap text-white underline decoration-white/40 hover:decoration-white" to="/login">
                  Log in
                </Link>
                <Link className={buttonClass('lemon', 'whitespace-nowrap px-3')} to="/register">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer onFelt />
    </div>
  );
}
