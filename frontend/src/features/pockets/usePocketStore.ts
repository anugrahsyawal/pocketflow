import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_POCKETS } from '@/data/defaultPockets';
import { STORAGE_KEYS } from '@/data/constants';
import type { Pocket, PocketGroupId } from '@/types/pocket';

interface PocketState {
  pockets: Pocket[];
  hasInitializedFromSetup: boolean;

  initializeFromSetup: (selectedPocketIds: string[], initialBalances: Record<string, number>) => void;
  updatePocketBudgetOwner: (pocketId: string, budgetOwnerPocketId: string | null) => void;
  resetPocketStore: () => void;

  // Helpers / Selectors (available via hook or store instance)
  getActivePockets: () => Pocket[];
  getPocketById: (id: string) => Pocket | undefined;
  getPocketsByGroup: (groupId: PocketGroupId) => Pocket[];
  getTotalBalance: () => number;
  getSpendableBalance: () => number;
}

export const usePocketStore = create<PocketState>()(
  persist(
    (set, get) => ({
      pockets: [],
      hasInitializedFromSetup: false,

      initializeFromSetup: (selectedPocketIds, initialBalances) => {
        // Guard to prevent overwriting user state repeatedly after first initialization
        if (get().hasInitializedFromSetup) return;

        const initializedPockets: Pocket[] = DEFAULT_POCKETS.filter((p) =>
          selectedPocketIds.includes(p.id)
        ).map((p) => {
          let startingBalance = p.monthlyAllocation ?? 0;
          if (p.id === 'cash') {
            startingBalance = initialBalances['cash'] ?? 0;
          } else if (p.id === 'nfc-card') {
            startingBalance = initialBalances['nfc-card'] ?? 0;
          }

          const now = new Date().toISOString();
          return {
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            groupId: p.groupId,
            monthlyAllocation: p.monthlyAllocation,
            initialBalance: startingBalance,
            currentBalance: startingBalance,
            isSpendable: p.isSpendable,
            isArchived: false,
            budgetOwnerPocketId: p.budgetOwnerPocketId,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          };
        });

        set({
          pockets: initializedPockets,
          hasInitializedFromSetup: true,
        });
      },

      updatePocketBudgetOwner: (pocketId, budgetOwnerPocketId) => {
        const now = new Date().toISOString();
        set((state) => ({
          pockets: state.pockets.map((p) => {
            if (p.id !== pocketId) return p;
            return {
              ...p,
              budgetOwnerPocketId: budgetOwnerPocketId || undefined,
              updatedAt: now,
            };
          }),
        }));
      },

      resetPocketStore: () => {
        set({
          pockets: [],
          hasInitializedFromSetup: false,
        });
      },

      getActivePockets: () => {
        return get().pockets.filter((p) => p.isActive && !p.isArchived);
      },

      getPocketById: (id) => {
        return get().pockets.find((p) => p.id === id);
      },

      getPocketsByGroup: (groupId) => {
        return get().pockets.filter((p) => p.groupId === groupId && p.isActive && !p.isArchived);
      },

      getTotalBalance: () => {
        return get().pockets
          .filter((p) => p.isActive && !p.isArchived)
          .reduce((sum, p) => sum + p.currentBalance, 0);
      },

      getSpendableBalance: () => {
        return get().pockets
          .filter((p) => p.isActive && !p.isArchived && p.groupId === 'daily' && p.isSpendable)
          .reduce((sum, p) => sum + p.currentBalance, 0);
      },
    }),
    {
      name: STORAGE_KEYS.POCKETS,
      partialize: (state) => ({
        pockets: state.pockets,
        hasInitializedFromSetup: state.hasInitializedFromSetup,
      }),
    }
  )
);
