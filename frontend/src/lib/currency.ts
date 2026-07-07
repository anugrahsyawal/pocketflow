export function formatRupiah(amount: number): string {
  const formatted = Math.abs(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return amount < 0 ? `-Rp${formatted}` : `Rp${formatted}`;
}

export function formatRupiahCompact(amount: number): string {
  if (amount >= 1000000) {
    return `+${amount / 1000000}jt`;
  }
  if (amount >= 1000) {
    return `+${amount / 1000}k`;
  }
  return `+${amount}`;
}

export function parseRupiah(value: string): number {
  const cleaned = value.replace(/[Rp.\s]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}
