import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataSource } from '../../api';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/** Lemon tape across the top of every page. */
export function DemoBanner() {
  return (
    <div className="sticky top-0 z-30 bg-lemon px-4 py-1.5 text-center font-mono text-xs font-bold tracking-wider text-ink shadow-[0_2px_6px_-2px_rgb(0_0_0/0.35)]">
      DEMO DATA — NOT REAL REGISTRATIONS
    </div>
  );
}

export function Brand({ to = '/', suffix, onFelt = true }: { to?: string; suffix?: string; onFelt?: boolean }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-[2px]">
      <span aria-hidden className="relative grid h-9 w-8 place-items-center bg-lemon pt-1 font-black text-ink shadow-[0_6px_10px_-6px_rgb(0_0_0/0.6)] [font-stretch:62%] text-xl">
        <span className="pin !top-[-5px] !h-2.5 !w-2.5" />N
      </span>
      <span className="leading-tight">
        <span className={`block text-[15px] font-extrabold whitespace-nowrap [font-stretch:80%] ${onFelt ? 'text-white' : 'text-ink'}`}>
          NxtWave Growth Hub{suffix && <span className={onFelt ? 'text-lemon' : 'text-felt'}> · {suffix}</span>}
        </span>
        <span className={`block font-mono text-[10.5px] whitespace-nowrap ${onFelt ? 'text-brand-100' : 'text-ink/70'}`}>Prototype · not affiliated</span>
      </span>
    </Link>
  );
}

export function ResetDemoDataButton({ className = '', label = 'Reset Demo Data' }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>
      <ConfirmDialog
        open={open}
        title="Reset demo data?"
        confirmLabel="Reset demo data"
        tone="danger"
        onCancel={() => setOpen(false)}
        onConfirm={async () => {
          await dataSource.resetDemoData();
          setOpen(false);
          navigate('/');
        }}
      >
        <p>
          This replaces everything stored in <strong>this browser</strong> (accounts you created, registrations, events, suggestions and
          settings) with the original fictional seed data. Everyone is signed out. This can't be undone.
        </p>
      </ConfirmDialog>
    </>
  );
}

export function Footer({ onFelt = false }: { onFelt?: boolean }) {
  return (
    <footer className={`px-4 py-8 text-xs ${onFelt ? 'text-brand-100' : 'border-t-2 border-ink/10 text-ink/75'}`}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl">
          NxtWave Growth Hub is a prototype for a simulated intern challenge. Not affiliated with or endorsed by NxtWave. All data is fictional
          and stored only in this browser.
        </p>
        <ResetDemoDataButton className={`font-bold underline ${onFelt ? 'text-lemon' : 'text-ink'}`} />
      </div>
    </footer>
  );
}
