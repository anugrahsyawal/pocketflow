import { ReactNode } from 'react';

type BadgeVariant = 'aman' | 'waspada' | 'bahaya' | 'overbudget' | 'info' | 'neutral';

interface BadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  aman: 'bg-aman-soft text-aman',
  waspada: 'bg-waspada-soft text-waspada',
  bahaya: 'bg-bahaya-soft text-bahaya',
  overbudget: 'bg-bahaya text-white',
  info: 'bg-primary-soft text-primary',
  neutral: 'bg-surface-container text-text-secondary',
};

export function Badge({ variant, children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-label-caps font-body ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}
