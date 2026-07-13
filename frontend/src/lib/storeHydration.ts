import { useState, useEffect } from 'react';

/**
 * Hook to track hydration status of a persisted Zustand store.
 * Prevents premature redirects or rendering based on unhydrated initial state.
 */
export function useStoreHydration(store: any) {
  const [hydrated, setHydrated] = useState(() => store.persist.hasHydrated());

  useEffect(() => {
    if (store.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    const unsub = store.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    return () => {
      unsub();
    };
  }, [store]);

  return hydrated;
}
