// Email identity rules. See docs/measurement.md §3.

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

export const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'yopmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  '10minutemail.com',
  'tempmail.com',
  'temp-mail.org',
  'trashmail.com',
  'getnada.com',
  'dispostable.com',
  'maildrop.cc',
  'throwawaymail.com',
]);

/** The uniqueness key: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Collapses Gmail dot / +tag aliases onto one key. Other domains are only normalized. */
export function aliasKey(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf('@');
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  if (!GMAIL_DOMAINS.has(domain)) return normalized;
  return `${local.split('+')[0].replace(/\./g, '')}@gmail.com`;
}

export function isDisposable(email: string): boolean {
  const normalized = normalizeEmail(email);
  return DISPOSABLE_DOMAINS.has(normalized.slice(normalized.lastIndexOf('@') + 1));
}

export type DuplicateReason = 'alias' | 'disposable';

/**
 * Flags (never rejects) suspected duplicates. A record is flagged when its alias key matches an
 * *earlier* record, or its domain is disposable. Input order does not matter; created_at does.
 */
export function suspectedDuplicates(
  rows: { id: string; email: string; created_at: string }[],
): Map<string, DuplicateReason[]> {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const seen = new Set<string>();
  const flags = new Map<string, DuplicateReason[]>();
  for (const row of sorted) {
    const reasons: DuplicateReason[] = [];
    const key = aliasKey(row.email);
    if (seen.has(key)) reasons.push('alias');
    if (isDisposable(row.email)) reasons.push('disposable');
    seen.add(key);
    if (reasons.length) flags.set(row.id, reasons);
  }
  return flags;
}
