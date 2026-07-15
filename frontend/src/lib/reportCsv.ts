import type { Transaction } from '@/types/transaction';
import type { Pocket } from '@/types/pocket';
import type { Category } from '@/types/category';

function sanitizeTextField(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  const str = String(value);
  const trimmed = str.trim();
  if (
    trimmed.startsWith('=') ||
    trimmed.startsWith('+') ||
    trimmed.startsWith('-') ||
    trimmed.startsWith('@')
  ) {
    return `'${str}`;
  }
  return str;
}

function csvQuote(val: string): string {
  const escaped = val.replace(/"/g, '""');
  return `"${escaped}"`;
}

export function generateCsvString(
  transactions: Transaction[],
  pockets: Pocket[],
  categories: Category[]
): string {
  const pocketMap = new Map<string, string>();
  for (const p of pockets) {
    pocketMap.set(p.id, p.name);
  }

  const categoryMap = new Map<string, string>();
  for (const c of categories) {
    categoryMap.set(c.id, c.name);
  }

  const headers = [
    'transaction_id',
    'type',
    'date',
    'time',
    'amount',
    'pocket',
    'source_pocket',
    'destination_pocket',
    'category',
    'income_source',
    'transfer_type',
    'note',
    'created_at',
    'updated_at',
  ];

  const lines: string[] = [];
  lines.push(headers.map(csvQuote).join(','));

  for (const t of transactions) {
    if (t.isArchived) continue;

    let pocketName = '';
    let sourcePocketName = '';
    let destinationPocketName = '';
    let categoryName = '';

    if (t.type === 'expense' || t.type === 'income') {
      if (t.pocketId) {
        pocketName = pocketMap.get(t.pocketId) || 'Pocket tidak tersedia';
      } else {
        pocketName = 'Pocket tidak tersedia';
      }
    }

    if (t.type === 'transfer') {
      if (t.fromPocketId) {
        sourcePocketName = pocketMap.get(t.fromPocketId) || 'Pocket tidak tersedia';
      } else {
        sourcePocketName = 'Pocket tidak tersedia';
      }
      if (t.toPocketId) {
        destinationPocketName = pocketMap.get(t.toPocketId) || 'Pocket tidak tersedia';
      } else {
        destinationPocketName = 'Pocket tidak tersedia';
      }
    }

    if (t.type === 'expense') {
      if (t.categoryId) {
        categoryName = categoryMap.get(t.categoryId) || 'Tanpa kategori';
      } else {
        categoryName = 'Tanpa kategori';
      }
    }

    const row = [
      sanitizeTextField(t.id),
      sanitizeTextField(t.type),
      sanitizeTextField(t.date),
      sanitizeTextField(t.time),
      String(t.amount),
      sanitizeTextField(pocketName),
      sanitizeTextField(sourcePocketName),
      sanitizeTextField(destinationPocketName),
      sanitizeTextField(categoryName),
      sanitizeTextField(t.incomeSource),
      sanitizeTextField(t.transferType),
      sanitizeTextField(t.note),
      sanitizeTextField(t.createdAt),
      sanitizeTextField(t.updatedAt),
    ];

    lines.push(row.map(csvQuote).join(','));
  }

  // Prepend UTF-8 BOM
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadCsv(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
