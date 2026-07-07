import { HTMLAttributes, ReactNode } from 'react';

type CardVariant = 'default' | 'pocket' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
  padding?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-surface rounded-card shadow-card',
  pocket: 'bg-surface rounded-pocket shadow-card',
  flat: 'bg-surface-container rounded-card',
};

export function Card({ variant = 'default', children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div className={`${variantClasses[variant]} ${padding ? 'p-4' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
