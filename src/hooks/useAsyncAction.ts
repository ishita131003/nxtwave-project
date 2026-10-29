import { useState } from 'react';
import { ServiceError } from '../api/errors';

/** Wraps a submit handler with pending state and service-error mapping for forms. */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ServiceError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
      return undefined;
    } finally {
      setPending(false);
    }
  }

  return { pending, error, fieldErrors, run, setError };
}
