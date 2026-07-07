export type TransactionType = 'income' | 'expense' | 'transfer';

export type TransferType = 'normal' | 'tarik-tunai' | 'top-up-nfc' | 'reimbursement' | 'saving-allocation';

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
  date: string;
  time: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
