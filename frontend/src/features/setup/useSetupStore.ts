import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_BUDGET_START_DAY, STORAGE_KEYS } from '@/data/constants';

interface SetupState {
  /** Whether the user has completed the initial setup wizard. */
  isSetupComplete: boolean;

  /** Budget period start day (1–28). Default: 26 (salary day). */
  budgetPeriodStartDay: number;

  /** Pocket IDs the user has selected during setup. */
  selectedPocketIds: string[];

  /** Initial balances for pockets without monthly allocation (Cash, NFC). */
  initialBalances: Record<string, number>;

  // --- Actions ---
  setBudgetPeriodStartDay: (day: number) => void;
  setSelectedPocketIds: (ids: string[]) => void;
  setInitialBalance: (pocketId: string, amount: number) => void;
  markSetupComplete: () => void;
  resetSetup: () => void;
}

export const useSetupStore = create<SetupState>()(
  persist(
    (set) => ({
      isSetupComplete: false,
      budgetPeriodStartDay: DEFAULT_BUDGET_START_DAY,
      selectedPocketIds: [],
      initialBalances: {},

      setBudgetPeriodStartDay: (day) => {
        set({ budgetPeriodStartDay: Math.max(1, Math.min(28, day)) });
      },

      setSelectedPocketIds: (ids) => {
        set({ selectedPocketIds: ids });
      },

      setInitialBalance: (pocketId, amount) => {
        set((state) => ({
          initialBalances: {
            ...state.initialBalances,
            [pocketId]: Math.max(0, amount),
          },
        }));
      },

      markSetupComplete: () => {
        set({ isSetupComplete: true });
      },

      resetSetup: () => {
        set({
          isSetupComplete: false,
          budgetPeriodStartDay: DEFAULT_BUDGET_START_DAY,
          selectedPocketIds: [],
          initialBalances: {},
        });
      },
    }),
    {
      name: STORAGE_KEYS.SETUP,
      partialize: (state) => ({
        isSetupComplete: state.isSetupComplete,
        budgetPeriodStartDay: state.budgetPeriodStartDay,
        selectedPocketIds: state.selectedPocketIds,
        initialBalances: state.initialBalances,
      }),
    }
  )
);
