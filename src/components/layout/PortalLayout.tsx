import { LogOut, type LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Brand, DemoBanner, Footer } from './Chrome';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Portals: a felt band carries the brand and the section tabs; the active tab is the white sheet the
 * page is written on. Content sits on the pale corridor wall.
 */
export function PortalLayout({ nav, portal, home, loginPath }: { nav: NavItem[]; portal: string; home: string; loginPath: string }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 shrink-0 items-center gap-2 rounded-t-[3px] px-3.5 text-sm font-bold whitespace-nowrap [font-stretch:85%] transition-colors ${
      isActive ? 'bg-wall text-ink' : 'text-white hover:bg-white/10'
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <header className="felt">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-3 pb-2">
          <Brand to={home} suffix={portal} />
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-[3px] px-2 text-sm font-bold whitespace-nowrap text-white hover:bg-white/10 sm:px-3"
            onClick={async () => {
              await logout();
              navigate(loginPath);
            }}
          >
            <LogOut aria-hidden className="h-4 w-4" /> <span className="sr-only sm:not-sr-only">Log out</span>
          </button>
        </div>
        <nav aria-label={`${portal} navigation`} className="mx-auto max-w-6xl">
          <ul className="flex gap-1 overflow-x-auto px-2 pt-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} className={tabClass}>
                  <Icon aria-hidden className="h-4 w-4" /> {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
