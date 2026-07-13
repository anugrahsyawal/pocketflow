import { useEffect } from 'react';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useStoreHydration } from '@/lib/storeHydration';

/**
 * AppDataInitializer sits at the root of the app and automatically initializes
 * the pocket store once setup has been successfully completed.
 * It is hydration-safe and runs exactly once.
 */
export function AppDataInitializer() {
  const isSetupComplete = useSetupStore((s) => s.isSetupComplete);
  const selectedPocketIds = useSetupStore((s) => s.selectedPocketIds);
  const initialBalances = useSetupStore((s) => s.initialBalances);

  const hasInitializedFromSetup = usePocketStore((s) => s.hasInitializedFromSetup);
  const initializeFromSetup = usePocketStore((s) => s.initializeFromSetup);

  const isSetupHydrated = useStoreHydration(useSetupStore);
  const isPocketHydrated = useStoreHydration(usePocketStore);

  useEffect(() => {
    // Only run if both stores have rehydrated from localStorage
    if (!isSetupHydrated || !isPocketHydrated) return;

    if (isSetupComplete && !hasInitializedFromSetup && selectedPocketIds.length > 0) {
      initializeFromSetup(selectedPocketIds, initialBalances);
    }
  }, [
    isSetupComplete,
    hasInitializedFromSetup,
    selectedPocketIds,
    initialBalances,
    initializeFromSetup,
    isSetupHydrated,
    isPocketHydrated,
  ]);

  return null;
}
