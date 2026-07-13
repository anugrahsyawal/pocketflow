import { useEffect } from 'react';
import { useSetupStore } from '@/features/setup/useSetupStore';
import { usePocketStore } from '@/features/pockets/usePocketStore';
import { useCategoryStore } from '@/features/categories/useCategoryStore';
import { useStoreHydration } from '@/lib/storeHydration';

/**
 * AppDataInitializer sits at the root of the app and automatically initializes
 * the pocket store and category store once setup has been successfully completed.
 * It is hydration-safe and runs exactly once.
 */
export function AppDataInitializer() {
  const isSetupComplete = useSetupStore((s) => s.isSetupComplete);
  const selectedPocketIds = useSetupStore((s) => s.selectedPocketIds);
  const initialBalances = useSetupStore((s) => s.initialBalances);

  const pockets = usePocketStore((s) => s.pockets);
  const hasInitializedFromSetup = usePocketStore((s) => s.hasInitializedFromSetup);
  const initializeFromSetup = usePocketStore((s) => s.initializeFromSetup);

  const hasInitializedFromPockets = useCategoryStore((s) => s.hasInitializedFromPockets);
  const initializeFromPockets = useCategoryStore((s) => s.initializeFromPockets);

  const isSetupHydrated = useStoreHydration(useSetupStore);
  const isPocketHydrated = useStoreHydration(usePocketStore);
  const isCategoryHydrated = useStoreHydration(useCategoryStore);

  useEffect(() => {
    // Only run if all stores have rehydrated from localStorage
    if (!isSetupHydrated || !isPocketHydrated || !isCategoryHydrated) return;

    // 1. Initialize pockets from setup
    if (isSetupComplete && !hasInitializedFromSetup && selectedPocketIds.length > 0) {
      initializeFromSetup(selectedPocketIds, initialBalances);
    }

    // 2. Initialize categories from pockets (only after pockets have been initialized)
    if (hasInitializedFromSetup && !hasInitializedFromPockets && pockets.length > 0) {
      const activePocketIds = pockets.filter((p) => p.isActive && !p.isArchived).map((p) => p.id);
      initializeFromPockets(activePocketIds);
    }
  }, [
    isSetupComplete,
    hasInitializedFromSetup,
    selectedPocketIds,
    initialBalances,
    initializeFromSetup,
    pockets,
    hasInitializedFromPockets,
    initializeFromPockets,
    isSetupHydrated,
    isPocketHydrated,
    isCategoryHydrated,
  ]);

  return null;
}
