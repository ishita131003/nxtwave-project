// Captures utm_* and ?ref= from the landing URL into sessionStorage so attribution survives
// navigation to /register, and keeps a random anonymous session id for the event log (no PII).
import type { DataSource } from '../api/dataSource';
import type { ObservedAttribution } from './schema';

const ATTRIBUTION_KEY = 'nxg:attribution';
const ANON_SESSION_KEY = 'nxg:anon_session';
const PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'ref'] as const;

export function getAnonSessionId(storage: Storage): string {
  let id = storage.getItem(ANON_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    storage.setItem(ANON_SESSION_KEY, id);
  }
  return id;
}

export function parseAttribution(search: string): ObservedAttribution {
  const params = new URLSearchParams(search);
  const out: ObservedAttribution = {};
  for (const key of PARAMS) {
    const value = params.get(key)?.trim();
    if (value) out[key] = (key === 'ref' ? value.toUpperCase() : value).slice(0, key === 'ref' ? 40 : 100);
  }
  return out;
}

/** A link with any tracking parameter replaces the stored attribution (last touch wins). */
export function captureAttribution(search: string, storage: Storage): ObservedAttribution {
  const fresh = parseAttribution(search);
  if (Object.keys(fresh).length) storage.setItem(ATTRIBUTION_KEY, JSON.stringify(fresh));
  return readAttribution(storage);
}

export function readAttribution(storage: Storage): ObservedAttribution {
  const raw = storage.getItem(ATTRIBUTION_KEY);
  return raw ? (JSON.parse(raw) as ObservedAttribution) : {};
}

/** What the landing page does on load: capture attribution and log landing_view (+ ref_link_open). */
export async function trackLanding(ds: DataSource, search: string, storage: Storage): Promise<ObservedAttribution> {
  const fresh = parseAttribution(search);
  const attribution = captureAttribution(search, storage);
  const session_id = getAnonSessionId(storage);
  const utm = { utm_source: fresh.utm_source, utm_medium: fresh.utm_medium, utm_campaign: fresh.utm_campaign };
  if (fresh.ref) await ds.trackEvent({ type: 'ref_link_open', session_id, ref: fresh.ref, ...utm });
  await ds.trackEvent({ type: 'landing_view', session_id, ref: fresh.ref, ...utm });
  return attribution;
}
