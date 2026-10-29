import { useState } from 'react';

/** Copies text and reports the outcome; in-app browsers often block the clipboard. */
export function useClipboard() {
  const [status, setStatus] = useState<{ key: string; ok: boolean } | null>(null);

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus({ key, ok: true });
    } catch {
      setStatus({ key, ok: false });
    }
  }

  return { status, copy };
}
