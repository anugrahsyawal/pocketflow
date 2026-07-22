export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransferType = 'normal' | 'tarik-tunai' | 'top-up-nfc' | 'reimbursement' | 'saving-allocation' | 'budget-reallocation';

export type IncomeSource = 'gaji' | 'bonus' | 'cashback' | 'reimbursement' | 'other';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  pocketId?: string;
  fromPocketId?: string;
  toPocketId?: string;
  categoryId?: string;
  transferType?: TransferType;
  incomeSource?: IncomeSource;
  budgetPocketId?: string;
  date: string;
  time: string;
  note: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Input type for creating a new transaction (omit system-generated fields). */
export type TransactionInput = Omit<Transaction, 'id' | 'isArchived' | 'createdAt' | 'updatedAt'>;

/** Allowed fields for updating an existing transaction. */
export type TransactionUpdate = Partial<Omit<Transaction, 'id' | 'type' | 'createdAt' | 'updatedAt'>>;
