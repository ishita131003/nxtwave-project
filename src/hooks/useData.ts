import { useCallback, useEffect, useRef, useState } from 'react';
import { dataSource } from '../api';

export interface DataState<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
}

/** Runs an async loader and re-runs it whenever the store changes (this tab or another). */
export function useData<T>(loader: () => Promise<T>, deps: unknown[]): DataState<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({ loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(() => {
    let cancelled = false;
    loaderRef
      .current()
      .then((data) => !cancelled && setState({ data, loading: false }))
      .catch((error) => !cancelled && setState({ error, loading: false }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const cancel = run();
    const unsubscribe = dataSource.subscribe(run);
    return () => {
      cancel();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data: state.data, error: state.error, loading: state.loading, reload: run };
}
