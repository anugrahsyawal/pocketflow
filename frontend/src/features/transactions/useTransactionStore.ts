import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS } from '@/data/constants';
import type { Transaction, TransactionInput, TransactionType, TransactionUpdate } from '@/types/transaction';
import { validateTransaction } from '@/lib/transactionValidation';

interface TransactionState {
  transactions: Transaction[];

  // Actions
  addTransaction: (input: TransactionInput) => { success: boolean; errors: string[]; transaction?: Transaction };
  updateTransaction: (id: string, updates: TransactionUpdate) => void;
  archiveTransaction: (id: string) => void;
  restoreTransaction: (id: string) => void;
  deleteTransaction: (id: string) => void;
  resetTransactionStore: () => void;

  // Selectors
  getActiveTransactions: () => Transaction[];
  getTransactionById: (id: string) => Transaction | undefined;
  getTransactionsByPocketId: (pocketId: string) => Transaction[];
  getTransactionsByType: (type: TransactionType) => Transaction[];
  getRecentTransactions: (limit: number) => Transaction[];
  getExpenseTotal: () => number;
  getIncomeTotal: () => number;
  getTransferTotal: () => number;
  getExpenseTotalByPocketId: (pocketId: string) => number;
  getIncomeTotalByPocketId: (pocketId: string) => number;
}

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set, get) => ({
      transactions: [],

      addTransaction: (input) => {
        const validation = validateTransaction(input);
        if (!validation.valid) {
          return { success: false, errors: validation.errors };
        }

        const now = new Date().toISOString();
        const newTransaction: Transaction = {
          ...input,
          id: `txn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          transactions: [newTransaction, ...state.transactions],
        }));

        return { success: true, errors: [], transaction: newTransaction };
      },

      updateTransaction: (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: now } : t
          ),
        }));
      },

      archiveTransaction: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, isArchived: true, updatedAt: now } : t
          ),
        }));
      },

      restoreTransaction: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, isArchived: false, updatedAt: now } : t
          ),
        }));
      },

      deleteTransaction: (id) => {
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));
      },

      resetTransactionStore: () => {
        set({ transactions: [] });
      },

      // --- Selectors ---

      getActiveTransactions: () => {
        return get().transactions.filter((t) => !t.isArchived);
      },

      getTransactionById: (id) => {
        return get().transactions.find((t) => t.id === id);
      },

      getTransactionsByPocketId: (pocketId) => {
        return get().transactions.filter((t) => {
          if (t.isArchived) return false;
          if (t.type === 'transfer') {
            return t.fromPocketId === pocketId || t.toPocketId === pocketId;
          }
          return t.pocketId === pocketId;
        });
      },

      getTransactionsByType: (type) => {
        return get().transactions.filter((t) => t.type === type && !t.isArchived);
      },

      getRecentTransactions: (limit) => {
        return get().transactions
          .filter((t) => !t.isArchived)
          .sort((a, b) => {
            // Sort by date desc, then createdAt desc
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            return b.createdAt.localeCompare(a.createdAt);
          })
          .slice(0, limit);
      },

      getExpenseTotal: () => {
        return get().transactions
          .filter((t) => t.type === 'expense' && !t.isArchived)
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getIncomeTotal: () => {
        return get().transactions
          .filter((t) => t.type === 'income' && !t.isArchived)
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getTransferTotal: () => {
        return get().transactions
          .filter((t) => t.type === 'transfer' && !t.isArchived)
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getExpenseTotalByPocketId: (pocketId) => {
        return get().transactions
          .filter((t) => t.type === 'expense' && t.pocketId === pocketId && !t.isArchived)
          .reduce((sum, t) => sum + t.amount, 0);
      },

      getIncomeTotalByPocketId: (pocketId) => {
        return get().transactions
          .filter((t) => t.type === 'income' && t.pocketId === pocketId && !t.isArchived)
          .reduce((sum, t) => sum + t.amount, 0);
      },
    }),
    {
      name: STORAGE_KEYS.TRANSACTIONS,
      partialize: (state) => ({
        transactions: state.transactions,
      }),
    }
  )
);
