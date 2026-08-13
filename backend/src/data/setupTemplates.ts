export interface TemplateCategorySpec {
  name: string;
  emoji: string;
}

export interface TemplatePocketSpec {
  key: string;
  name: string;
  emoji: string;
  groupId: 'daily' | 'bills' | 'savings';
  isSpendable: boolean;
  monthlyAllocation: number | null;
  companionKey?: string;
  categories: TemplateCategorySpec[];
}

export const SETUP_TEMPLATES: Record<string, TemplatePocketSpec> = {
  'food-groceries': {
    key: 'food-groceries',
    name: 'Food & Groceries',
    emoji: '🍜',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: 1300000,
    categories: [
      { name: 'Sarapan', emoji: '🌅' },
      { name: 'Makan siang', emoji: '🍱' },
      { name: 'Makan malam', emoji: '🍽️' },
      { name: 'Snack/jajan', emoji: '🍿' },
      { name: 'Minuman', emoji: '🥤' },
      { name: 'Groceries', emoji: '🛒' },
      { name: 'Minimarket', emoji: '🏪' },
      { name: 'Weekend food', emoji: '🍕' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'cash': {
    key: 'cash',
    name: 'Cash',
    emoji: '💵',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: null,
    companionKey: 'food-groceries',
    categories: [],
  },
  'transportation': {
    key: 'transportation',
    name: 'Transportation',
    emoji: '🚆',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: 200000,
    categories: [
      { name: 'MRT', emoji: '🚆' },
      { name: 'Ojek online', emoji: '🏍️' },
      { name: 'Bus/angkot', emoji: '🚌' },
      { name: 'Top up NFC', emoji: '💳' },
      { name: 'Weekend transport', emoji: '🚕' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'nfc-card': {
    key: 'nfc-card',
    name: 'NFC Transportation Card',
    emoji: '💳',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: null,
    companionKey: 'transportation',
    categories: [],
  },
  'personal-care': {
    key: 'personal-care',
    name: 'Personal Care',
    emoji: '🧴',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: 133500,
    categories: [
      { name: 'Laundry/deterjen', emoji: '🧺' },
      { name: 'Sabun mandi', emoji: '🧼' },
      { name: 'Skincare', emoji: '🧴' },
      { name: 'Deodoran/parfum', emoji: '🌸' },
      { name: 'Haircut', emoji: '💈' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'entertainment': {
    key: 'entertainment',
    name: 'Entertainment',
    emoji: '🎮',
    groupId: 'daily',
    isSpendable: true,
    monthlyAllocation: 200000,
    categories: [
      { name: 'Hangout', emoji: '🎉' },
      { name: 'Coffee/ngopi', emoji: '☕' },
      { name: 'Movie/streaming', emoji: '🎬' },
      { name: 'Game', emoji: '🎮' },
      { name: 'Social event', emoji: '🥂' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'housing-utilities': {
    key: 'housing-utilities',
    name: 'Housing & Utilities',
    emoji: '🏠',
    groupId: 'bills',
    isSpendable: false,
    monthlyAllocation: 866500,
    categories: [
      { name: 'Kos', emoji: '🏠' },
      { name: 'Internet', emoji: '🌐' },
      { name: 'Listrik', emoji: '⚡' },
      { name: 'Air', emoji: '💧' },
      { name: 'Admin/fee', emoji: '🏢' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'sinking-fund': {
    key: 'sinking-fund',
    name: 'Sinking Fund',
    emoji: '🎯',
    groupId: 'savings',
    isSpendable: false,
    monthlyAllocation: 500000,
    categories: [],
  },
  'self-investment': {
    key: 'self-investment',
    name: 'Self-Investment',
    emoji: '📚',
    groupId: 'savings',
    isSpendable: false,
    monthlyAllocation: 250000,
    categories: [
      { name: 'Buku', emoji: '📖' },
      { name: 'Course', emoji: '🎓' },
      { name: 'Certification', emoji: '📜' },
      { name: 'Tools/software', emoji: '🛠️' },
      { name: 'Learning subscription', emoji: '📲' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'investments': {
    key: 'investments',
    name: 'Investments',
    emoji: '📈',
    groupId: 'savings',
    isSpendable: false,
    monthlyAllocation: 150000,
    categories: [
      { name: 'Reksa dana', emoji: '📊' },
      { name: 'Saham', emoji: '📈' },
      { name: 'Emas', emoji: '🥇' },
      { name: 'Learning investment', emoji: '🧠' },
      { name: 'Other', emoji: '📝' },
    ],
  },
  'emergency-buffer': {
    key: 'emergency-buffer',
    name: 'Emergency Buffer',
    emoji: '🛡️',
    groupId: 'savings',
    isSpendable: false,
    monthlyAllocation: 200000,
    categories: [],
  },
  'term-deposit': {
    key: 'term-deposit',
    name: 'Term Deposit',
    emoji: '🏦',
    groupId: 'savings',
    isSpendable: false,
    monthlyAllocation: 2000000,
    categories: [],
  },
};
