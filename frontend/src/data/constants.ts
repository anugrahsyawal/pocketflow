import type { PocketGroup } from '@/types/pocket';

export const APP_NAME = 'PocketFlow';
export const APP_VERSION = '0.1.0';
export const DEFAULT_BUDGET_START_DAY = 26;
export const DEFAULT_USER_NAME = 'Kyune';
export const DEFAULT_USER_EMAIL = 'kyune@example.com';
export const MOCK_PASSWORD = 'pocketflow123';
export const MAX_APP_WIDTH = 480;

export const POCKET_GROUPS: PocketGroup[] = [
  { id: 'daily', label: 'Harian', labelEn: 'Daily Spending' },
  { id: 'bills', label: 'Tagihan', labelEn: 'Bills' },
  { id: 'savings', label: 'Tabungan & Masa Depan', labelEn: 'Savings & Future' },
];

export const TRANSFER_TYPE_LABELS: Record<string, string> = {
  'normal': 'Transfer biasa',
  'tarik-tunai': 'Tarik Tunai',
  'top-up-nfc': 'Top up NFC',
  'reimbursement': 'Reimbursement',
  'saving-allocation': 'Alokasi tabungan',
  'budget-reallocation': 'Pindah Alokasi Budget',
};

export const TRANSFER_TYPE_EMOJIS: Record<string, string> = {
  'normal': '↔️',
  'tarik-tunai': '💵',
  'top-up-nfc': '💳',
  'reimbursement': '🔄',
  'saving-allocation': '🏦',
  'budget-reallocation': '🔀',
};

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  'gaji': 'Gaji',
  'bonus': 'Bonus',
  'cashback': 'Cashback',
  'reimbursement': 'Reimbursement',
  'other': 'Lainnya',
};

export const INCOME_SOURCE_EMOJIS: Record<string, string> = {
  'gaji': '💼',
  'bonus': '🎁',
  'cashback': '✨',
  'reimbursement': '🔄',
  'other': '📝',
};

export const QUICK_AMOUNT_CHIPS = [3000, 5000, 10000, 15000, 20000, 25000, 50000];

export const STATUS_THRESHOLDS = {
  aman: 0.7,
  waspada: 0.9,
  bahaya: 1.0,
} as const;

export const MASKED_AMOUNT = '\u2022\u2022\u2022\u2022\u2022\u2022';

export const STORAGE_KEYS = {
  AUTH: 'pocketflow_auth',
  SETUP: 'pocketflow_setup',
  POCKETS: 'pocketflow_pockets',
  CATEGORIES: 'pocketflow_categories',
  TRANSACTIONS: 'pocketflow_transactions',
  SETTINGS: 'pocketflow_settings',
  REPORT_PREFERENCES: 'pocketflow_report_preferences',
} as const;
