import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/data/constants';

interface ReportPreferencesState {
  sinkingFundExcludedPocketIds: string[];

  setSinkingFundPocketIncluded: (pocketId: string, included: boolean) => void;
  resetSinkingFundExclusions: () => void;
}

export const useReportPreferencesStore = create<ReportPreferencesState>()(
  persist(
    (set, get) => ({
      sinkingFundExcludedPocketIds: [],

      setSinkingFundPocketIncluded: (pocketId: string, included: boolean) => {
        if (!pocketId || !pocketId.trim()) return;
        const current = get().sinkingFundExcludedPocketIds;
        if (included) {
          set({
            sinkingFundExcludedPocketIds: current.filter((id) => id !== pocketId),
          });
        } else {
          if (!current.includes(pocketId)) {
            set({
              sinkingFundExcludedPocketIds: [...current, pocketId],
            });
          }
        }
      },

      resetSinkingFundExclusions: () => {
        set({ sinkingFundExcludedPocketIds: [] });
      },
    }),
    {
      name: STORAGE_KEYS.REPORT_PREFERENCES,
      partialize: (state) => ({
        sinkingFundExcludedPocketIds: state.sinkingFundExcludedPocketIds,
      }),
    }
  )
);
