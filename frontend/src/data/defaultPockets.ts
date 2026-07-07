import type { Pocket } from '@/types/pocket';

export const DEFAULT_POCKETS: Omit<Pocket, 'createdAt' | 'updatedAt'>[] = [
  { id: 'food-groceries', name: 'Food & Groceries', emoji: '\ud83c\udf5c', groupId: 'daily', monthlyAllocation: 1300000, initialBalance: 1300000, isSpendable: true, isArchived: false },
  { id: 'cash', name: 'Cash', emoji: '\ud83d\udcb5', groupId: 'daily', monthlyAllocation: null, initialBalance: 0, isSpendable: true, isArchived: false },
  { id: 'transportation', name: 'Transportation', emoji: '\ud83d\ude87', groupId: 'daily', monthlyAllocation: 200000, initialBalance: 200000, isSpendable: true, isArchived: false },
  { id: 'nfc-card', name: 'NFC Transportation Card', emoji: '\ud83d\udcb3', groupId: 'daily', monthlyAllocation: null, initialBalance: 0, isSpendable: true, isArchived: false },
  { id: 'personal-care', name: 'Personal Care', emoji: '\ud83e\uddf4', groupId: 'daily', monthlyAllocation: 133500, initialBalance: 133500, isSpendable: true, isArchived: false },
  { id: 'entertainment', name: 'Entertainment', emoji: '\ud83c\udfae', groupId: 'daily', monthlyAllocation: 200000, initialBalance: 200000, isSpendable: true, isArchived: false },
  { id: 'housing-utilities', name: 'Housing & Utilities', emoji: '\ud83c\udfe0', groupId: 'bills', monthlyAllocation: 866500, initialBalance: 866500, isSpendable: false, isArchived: false },
  { id: 'sinking-fund', name: 'Sinking Fund', emoji: '\ud83c\udfaf', groupId: 'savings', monthlyAllocation: 500000, initialBalance: 500000, isSpendable: false, isArchived: false },
  { id: 'self-investment', name: 'Self-Investment', emoji: '\ud83d\udcda', groupId: 'savings', monthlyAllocation: 250000, initialBalance: 250000, isSpendable: false, isArchived: false },
  { id: 'investments', name: 'Investments', emoji: '\ud83d\udcc8', groupId: 'savings', monthlyAllocation: 150000, initialBalance: 150000, isSpendable: false, isArchived: false },
  { id: 'emergency-buffer', name: 'Emergency Buffer', emoji: '\ud83d\udee1\ufe0f', groupId: 'savings', monthlyAllocation: 200000, initialBalance: 200000, isSpendable: false, isArchived: false },
  { id: 'term-deposit', name: 'Term Deposit', emoji: '\ud83c\udfe6', groupId: 'savings', monthlyAllocation: 2000000, initialBalance: 2000000, isSpendable: false, isArchived: false },
];
