import { useEffect, useRef, useCallback } from 'react';

/**
 * Polls `fn` every `intervalMs` milliseconds.
 * Also re-fires immediately when the browser tab becomes visible again.
 */
export function useAutoRefresh(fn: () => void, intervalMs = 30_000) {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => fnRef.current(), []);

  useEffect(() => {
    const id = setInterval(run, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === 'visible') run();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [run, intervalMs]);
}
