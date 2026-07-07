import { formatRupiah } from '@/lib/currency';
import { MASKED_AMOUNT } from '@/data/constants';

type AmountSize = 'sm' | 'md' | 'lg';
type AmountColor = 'default' | 'income' | 'expense' | 'transfer' | 'muted';

interface AmountDisplayProps {
  amount: number;
  size?: AmountSize;
  color?: AmountColor;
  masked?: boolean;
  showSign?: boolean;
  className?: string;
}

const sizeClasses: Record<AmountSize, string> = {
  sm: 'text-body-sm font-semibold font-body',
  md: 'text-amount-md font-body',
  lg: 'text-amount-lg font-display',
};

const colorClasses: Record<AmountColor, string> = {
  default: 'text-text-primary',
  income: 'text-aman',
  expense: 'text-bahaya',
  transfer: 'text-primary',
  muted: 'text-text-muted',
};

export function AmountDisplay({ amount, size = 'md', color = 'default', masked = false, showSign = false, className = '' }: AmountDisplayProps) {
  if (masked) {
    return <span className={`${sizeClasses[size]} text-text-muted amount-masked ${className}`}>{MASKED_AMOUNT}</span>;
  }

  const prefix = showSign && amount > 0 ? '+' : '';
  const display = showSign && amount < 0 ? formatRupiah(amount) : `${prefix}${formatRupiah(Math.abs(amount))}`;

  return <span className={`${sizeClasses[size]} ${colorClasses[color]} ${className}`}>{display}</span>;
}
