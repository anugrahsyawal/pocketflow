import type { Category } from '@/types/category';

type DefaultCategory = Omit<Category, 'createdAt' | 'updatedAt'>;

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  // Food & Groceries
  { id: 'cat-food-1', name: 'Sarapan', emoji: '\ud83c\udf05', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-2', name: 'Makan siang', emoji: '\ud83c\udf71', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-3', name: 'Makan malam', emoji: '\ud83c\udf7d\ufe0f', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-4', name: 'Snack/jajan', emoji: '\ud83c\udf7f', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-5', name: 'Minuman', emoji: '\ud83e\udd64', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-6', name: 'Groceries', emoji: '\ud83d\uded2', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-7', name: 'Minimarket', emoji: '\ud83c\udfea', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-8', name: 'Weekend food', emoji: '\ud83c\udf55', pocketId: 'food-groceries', isArchived: false },
  { id: 'cat-food-9', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'food-groceries', isArchived: false },
  // Transportation
  { id: 'cat-transport-1', name: 'MRT', emoji: '\ud83d\ude87', pocketId: 'transportation', isArchived: false },
  { id: 'cat-transport-2', name: 'Ojek online', emoji: '\ud83c\udfcd\ufe0f', pocketId: 'transportation', isArchived: false },
  { id: 'cat-transport-3', name: 'Bus/angkot', emoji: '\ud83d\ude8c', pocketId: 'transportation', isArchived: false },
  { id: 'cat-transport-4', name: 'Top up NFC', emoji: '\ud83d\udcb3', pocketId: 'transportation', isArchived: false },
  { id: 'cat-transport-5', name: 'Weekend transport', emoji: '\ud83d\ude95', pocketId: 'transportation', isArchived: false },
  { id: 'cat-transport-6', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'transportation', isArchived: false },
  // Personal Care
  { id: 'cat-care-1', name: 'Laundry/deterjen', emoji: '\ud83e\uddfa', pocketId: 'personal-care', isArchived: false },
  { id: 'cat-care-2', name: 'Sabun mandi', emoji: '\ud83e\uddfc', pocketId: 'personal-care', isArchived: false },
  { id: 'cat-care-3', name: 'Skincare', emoji: '\ud83e\uddf4', pocketId: 'personal-care', isArchived: false },
  { id: 'cat-care-4', name: 'Deodoran/parfum', emoji: '\ud83c\udf38', pocketId: 'personal-care', isArchived: false },
  { id: 'cat-care-5', name: 'Haircut', emoji: '\ud83d\udc87', pocketId: 'personal-care', isArchived: false },
  { id: 'cat-care-6', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'personal-care', isArchived: false },
  // Entertainment
  { id: 'cat-ent-1', name: 'Hangout', emoji: '\ud83c\udf89', pocketId: 'entertainment', isArchived: false },
  { id: 'cat-ent-2', name: 'Coffee/ngopi', emoji: '\u2615', pocketId: 'entertainment', isArchived: false },
  { id: 'cat-ent-3', name: 'Movie/streaming', emoji: '\ud83c\udfac', pocketId: 'entertainment', isArchived: false },
  { id: 'cat-ent-4', name: 'Game', emoji: '\ud83c\udfae', pocketId: 'entertainment', isArchived: false },
  { id: 'cat-ent-5', name: 'Social event', emoji: '\ud83e\udd42', pocketId: 'entertainment', isArchived: false },
  { id: 'cat-ent-6', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'entertainment', isArchived: false },
  // Self-Investment
  { id: 'cat-self-1', name: 'Buku', emoji: '\ud83d\udcd6', pocketId: 'self-investment', isArchived: false },
  { id: 'cat-self-2', name: 'Course', emoji: '\ud83c\udf93', pocketId: 'self-investment', isArchived: false },
  { id: 'cat-self-3', name: 'Certification', emoji: '\ud83d\udcdc', pocketId: 'self-investment', isArchived: false },
  { id: 'cat-self-4', name: 'Tools/software', emoji: '\ud83d\udee0\ufe0f', pocketId: 'self-investment', isArchived: false },
  { id: 'cat-self-5', name: 'Learning subscription', emoji: '\ud83d\udcf1', pocketId: 'self-investment', isArchived: false },
  { id: 'cat-self-6', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'self-investment', isArchived: false },
  // Investments
  { id: 'cat-inv-1', name: 'Reksa dana', emoji: '\ud83d\udcca', pocketId: 'investments', isArchived: false },
  { id: 'cat-inv-2', name: 'Saham', emoji: '\ud83d\udcc8', pocketId: 'investments', isArchived: false },
  { id: 'cat-inv-3', name: 'Emas', emoji: '\ud83e\udd47', pocketId: 'investments', isArchived: false },
  { id: 'cat-inv-4', name: 'Learning investment', emoji: '\ud83e\udde0', pocketId: 'investments', isArchived: false },
  { id: 'cat-inv-5', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'investments', isArchived: false },
  // Housing & Utilities
  { id: 'cat-house-1', name: 'Kos', emoji: '\ud83c\udfe0', pocketId: 'housing-utilities', isArchived: false },
  { id: 'cat-house-2', name: 'Internet', emoji: '\ud83c\udf10', pocketId: 'housing-utilities', isArchived: false },
  { id: 'cat-house-3', name: 'Listrik', emoji: '\u26a1', pocketId: 'housing-utilities', isArchived: false },
  { id: 'cat-house-4', name: 'Air', emoji: '\ud83d\udca7', pocketId: 'housing-utilities', isArchived: false },
  { id: 'cat-house-5', name: 'Admin/fee', emoji: '\ud83c\udfe2', pocketId: 'housing-utilities', isArchived: false },
  { id: 'cat-house-6', name: 'Other', emoji: '\ud83d\udcdd', pocketId: 'housing-utilities', isArchived: false },
];
