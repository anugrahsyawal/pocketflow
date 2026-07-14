import type { TransactionInput } from '@/types/transaction';

export interface TransactionValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates a transaction input before it is saved to the store.
 * Returns a result object with a boolean `valid` flag and an array of error messages.
 */
export function validateTransaction(input: TransactionInput): TransactionValidationResult {
  const errors: string[] = [];

  // Amount validation
  if (input.amount <= 0) {
    errors.push('Jumlah transaksi harus lebih dari 0.');
  }
  if (!Number.isFinite(input.amount)) {
    errors.push('Jumlah transaksi tidak valid.');
  }

  // Date validation
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.push('Tanggal transaksi tidak valid.');
  }

  // Type-specific validation
  switch (input.type) {
    case 'expense':
      if (!input.pocketId) {
        errors.push('Pengeluaran harus memilih pocket tujuan.');
      }
      break;

    case 'income':
      if (!input.pocketId) {
        errors.push('Pemasukan harus memilih pocket tujuan.');
      }
      break;

    case 'transfer':
      if (!input.fromPocketId) {
        errors.push('Transfer harus memilih pocket asal.');
      }
      if (!input.toPocketId) {
        errors.push('Transfer harus memilih pocket tujuan.');
      }
      if (input.fromPocketId && input.toPocketId && input.fromPocketId === input.toPocketId) {
        errors.push('Pocket asal dan tujuan tidak boleh sama.');
      }
      break;

    default:
      errors.push('Tipe transaksi tidak valid.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
