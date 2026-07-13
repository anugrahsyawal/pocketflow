import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CATEGORIES } from '@/data/defaultCategories';
import { STORAGE_KEYS } from '@/data/constants';
import type { Category } from '@/types/category';

interface CategoryState {
  categories: Category[];
  hasInitializedFromPockets: boolean;

  initializeFromPockets: (activePocketIds: string[]) => void;
  addCategory: (pocketId: string, name: string, emoji: string) => void;
  updateCategory: (categoryId: string, updates: Partial<Omit<Category, 'id' | 'pocketId' | 'createdAt' | 'updatedAt'>>) => void;
  archiveCategory: (categoryId: string) => void;
  resetCategoryStore: () => void;

  // Selectors
  getActiveCategories: () => Category[];
  getCategoriesByPocketId: (pocketId: string) => Category[];
  getCategoryById: (id: string) => Category | undefined;
}

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: [],
      hasInitializedFromPockets: false,

      initializeFromPockets: (activePocketIds) => {
        // Safe guard to prevent overwriting user modifications repeatedly
        if (get().hasInitializedFromPockets) return;

        const initializedCategories: Category[] = DEFAULT_CATEGORIES.filter((c) =>
          activePocketIds.includes(c.pocketId)
        ).map((c) => {
          const now = new Date().toISOString();
          return {
            id: c.id,
            pocketId: c.pocketId,
            name: c.name,
            emoji: c.emoji,
            isDefault: true,
            isActive: true,
            isArchived: c.isArchived,
            createdAt: now,
            updatedAt: now,
          };
        });

        set({
          categories: initializedCategories,
          hasInitializedFromPockets: true,
        });
      },

      addCategory: (pocketId, name, emoji) => {
        const now = new Date().toISOString();
        const newCategory: Category = {
          id: `cat-custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          pocketId,
          name,
          emoji,
          isDefault: false,
          isActive: true,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          categories: [...state.categories, newCategory],
        }));
      },

      updateCategory: (categoryId, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, ...updates, updatedAt: now }
              : c
          ),
        }));
      },

      archiveCategory: (categoryId) => {
        const now = new Date().toISOString();
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId
              ? { ...c, isArchived: true, updatedAt: now }
              : c
          ),
        }));
      },

      resetCategoryStore: () => {
        set({
          categories: [],
          hasInitializedFromPockets: false,
        });
      },

      getActiveCategories: () => {
        return get().categories.filter((c) => !c.isArchived && c.isActive);
      },

      getCategoriesByPocketId: (pocketId) => {
        return get().categories.filter((c) => c.pocketId === pocketId && !c.isArchived && c.isActive);
      },

      getCategoryById: (id) => {
        return get().categories.find((c) => c.id === id);
      },
    }),
    {
      name: STORAGE_KEYS.CATEGORIES,
      partialize: (state) => ({
        categories: state.categories,
        hasInitializedFromPockets: state.hasInitializedFromPockets,
      }),
    }
  )
);
