import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../src/lib/crypto';
import { aliasKey, isDisposable, normalizeEmail, suspectedDuplicates } from '../src/lib/email';
import { escapeCsvCell, toCsv } from '../src/lib/csv';

describe('password hashing', () => {
  it('verifies the right password, rejects a wrong one, and salts per hash', async () => {
    const a = await hashPassword('StudentDemo@123');
    const b = await hashPassword('StudentDemo@123');
    expect(a.hash).not.toContain('StudentDemo');
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
    expect(await verifyPassword('StudentDemo@123', a)).toBe(true);
    expect(await verifyPassword('StudentDemo@124', a)).toBe(false);
  });
});

describe('email identity', () => {
  it('normalizes by trim + lowercase', () => {
    expect(normalizeEmail('  Riya.Sharma@Example.COM ')).toBe('riya.sharma@example.com');
  });

  it('collapses gmail dot and plus aliases only for gmail', () => {
    expect(aliasKey('R.iya.Sharma+ai@googlemail.com')).toBe('riyasharma@gmail.com');
    expect(aliasKey('riya.sharma+ai@example.com')).toBe('riya.sharma+ai@example.com');
  });

  it('flags later aliases and disposable domains without touching the original', () => {
    const flags = suspectedDuplicates([
      { id: 'b', email: 'rahulmehta@gmail.com', created_at: '2026-10-02T00:00:00Z' },
      { id: 'a', email: 'rahul.mehta@gmail.com', created_at: '2026-10-01T00:00:00Z' },
      { id: 'c', email: 'x@mailinator.com', created_at: '2026-10-03T00:00:00Z' },
    ]);
    expect([...flags.entries()]).toEqual([
      ['b', ['alias']],
      ['c', ['disposable']],
    ]);
    expect(isDisposable('a@example.com')).toBe(false);
  });
});

describe('CSV escaping', () => {
  it('neutralises formula triggers and quotes delimiters', () => {
    expect(['=SUM(A1)', '+91 98', '-1', '@cmd', 'plain'].map(escapeCsvCell)).toEqual([
      "'=SUM(A1)",
      "'+91 98",
      "'-1",
      "'@cmd",
      'plain',
    ]);
    expect(escapeCsvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(escapeCsvCell('=1,2')).toBe(`"'=1,2"`);
    expect(toCsv([{ n: '=x', m: 2 }], [{ key: 'n', header: 'Name' }, { key: 'm', header: 'M' }])).toBe("Name,M\r\n'=x,2");
  });
});
