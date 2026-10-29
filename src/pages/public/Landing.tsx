import { ArrowRight, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { dataSource } from '../../api';
import { buttonClass } from '../../components/ui/Button';
import { trackLanding } from '../../lib/attribution';

const FAQ: { q: string; a: string }[] = [
  { q: 'How much does it cost?', a: 'Nothing. The workshop is free.' },
  { q: 'Do I need to know AI or machine learning already?', a: 'No. It is designed for beginners. If you can follow step-by-step instructions on a laptop, you can take part.' },
  { q: 'When is it, and how do I join?', a: 'The date and joining details will be shared with registered participants. This demo does not set a date or a meeting link.' },
  { q: 'What do I need?', a: 'A laptop with a modern browser and a stable internet connection for about an hour.' },
  { q: 'Who can register?', a: 'It is aimed at final-year engineering students in India, but any engineering student is welcome to register.' },
  { q: 'What happens to my data?', a: 'In this prototype everything stays in your own browser. Nothing is sent to a server. The privacy note below lists the anonymous events we record.' },
];

const FACTS = ['Free', 'Online', 'Beginner-friendly', '60 minutes'];

/** Tear-off strips at the foot of the circular. Tearing one drops it and opens registration. */
function TearOffStrips({ label }: { label: string }) {
  const navigate = useNavigate();
  const [torn, setTorn] = useState<number | null>(null);
  return (
    <div className="flex" aria-label="Tear-off strips">
      {Array.from({ length: 7 }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Tear off a strip: ${label}`}
          disabled={torn !== null}
          onClick={() => {
            setTorn(i);
            window.setTimeout(() => navigate('/register'), 420);
          }}
          className={`strip flex h-28 flex-1 items-center justify-center bg-lemon font-mono text-[11px] font-bold tracking-wide text-ink [writing-mode:vertical-rl] first:border-l-0 hover:bg-[#d4e0f1] ${
            torn === i ? 'strip-torn' : ''
          } ${i === 2 || i === 5 ? 'max-[380px]:hidden' : ''}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export default function Landing() {
  const location = useLocation();
  const tracked = useRef(false);
  const [ref, setRef] = useState<string | undefined>();

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackLanding(dataSource, location.search, window.sessionStorage).then((a) => setRef(a.ref));
  }, [location.search]);

  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 pb-8 lg:min-h-[calc(100svh-8rem)] lg:grid-cols-[1.35fr_1fr] lg:items-center lg:gap-8 lg:pt-4 lg:pb-6">
        {/* The circular: the one sheet on this board that hangs slightly off true. */}
        <div className="-rotate-[1.2deg]">
          <article className="relative bg-lemon px-5 pt-7 pb-5 shadow-[0_14px_22px_-14px_rgb(0_0_0/0.65)] sm:px-8 sm:pt-8">
            <span className="pin" aria-hidden />
            <p className="flex justify-between gap-3 border-b-[1.5px] border-dashed border-ink/50 pb-2 font-mono text-xs font-bold tracking-wide">
              <span>CIRCULAR No. AI-60</span>
              <span>ALL BRANCHES</span>
            </p>
            <h1 className="display mt-4 text-[44px] text-ink sm:text-7xl lg:text-7xl">Build your first AI project</h1>
            <p className="mt-3 max-w-xl text-[17px] leading-snug text-ink/85">
              Turn your curiosity about AI into hands-on experience with a beginner-friendly workshop designed for aspiring engineers.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Key facts">
              {FACTS.map((f) => (
                <li key={f} className="border-2 border-ink px-2.5 py-1 text-sm font-extrabold [font-stretch:80%] uppercase">
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Link to="/register" className={buttonClass('primary', 'w-full px-6 text-base sm:w-auto')}>
                Register free <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
              <Link to="/login" className="min-h-11 content-center text-[15px] font-bold underline decoration-ink/40 hover:decoration-ink">
                Already registered? Log in
              </Link>
            </div>
          </article>
          <TearOffStrips label={ref ? `CODE ${ref}` : 'REGISTER · FREE'} />
        </div>

        <div className="flex flex-col gap-5">
          <div className="relative bg-pink p-5 pt-6 shadow-[0_12px_20px_-14px_rgb(0_0_0/0.6)]">
            <span className="pin" aria-hidden />
            <p className="display text-4xl text-ink sm:text-5xl">Stop Just Exploring AI. Start Building It.</p>
            <p className="mt-4 font-mono text-sm font-bold tracking-wide text-ink">LIMITED SEATS ONLY</p>
          </div>

          <div className="sheet relative p-5 pt-6">
            <span className="pin" aria-hidden />
            <dl className="space-y-4 text-[15px] leading-snug">
              <div>
                <dt className="font-mono text-xs font-bold tracking-wide text-felt">WHAT</dt>
                <dd className="mt-1">Build a working AI project from start to finish.</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-bold tracking-wide text-felt">WHO</dt>
                <dd className="mt-1">Engineering students. No AI background needed.</dd>
              </div>
              <div>
                <dt className="font-mono text-xs font-bold tracking-wide text-felt">WHY</dt>
                <dd className="mt-1">Learn by building, not watching slides.</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-12">
        <div className="sheet relative px-5 pt-8 pb-3 sm:px-8">
          <span className="pin" aria-hidden />
          <h2 className="display text-4xl">Questions</h2>
          <div className="mt-4 divide-y-[1.5px] divide-dashed divide-ink/30">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group py-2">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-bold [&::-webkit-details-marker]:hidden">
                  {q}
                  <Plus aria-hidden className="h-5 w-5 shrink-0 text-felt transition-transform duration-200 group-open:rotate-45" />
                </summary>
                <p className="pb-3 text-ink/85">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 text-center text-white">
        <h2 className="display text-5xl sm:text-6xl">Ready to build something of your own?</h2>
        <p className="mt-3 text-brand-100">Registration takes about a minute.</p>
        <Link to="/register" className={buttonClass('lemon', 'mt-6 px-6 text-base')}>
          Register free <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <div className="sheet mx-auto mt-12 flex max-w-xl gap-3 p-4 text-left text-sm text-ink">
          <ShieldCheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-felt" />
          <p>
            <strong>Privacy note.</strong> To measure the campaign we record anonymous page-view events (landing view, register view,
            referral-link open, successful registration) with a random session ID and any UTM or referral code in the link. No name, email
            or other personal detail is stored with these events, and in this demo nothing leaves your browser.
          </p>
        </div>
      </section>
    </>
  );
}
