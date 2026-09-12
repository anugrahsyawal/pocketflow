import { HTMLAttributes, ReactNode } from 'react';

type CardVariant = 'default' | 'pocket' | 'flat';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  children: ReactNode;
  padding?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'rounded-card shadow-card',
  pocket: 'rounded-pocket shadow-card',
  flat: 'rounded-card',
};

export function Card({ variant = 'default', children, padding = true, className = '', ...props }: CardProps) {
  // An explicit surface tint must not compete with the variant's default color.
  const background = /(?:^|\s)bg-\S+/.test(className)
    ? ''
    : variant === 'flat' ? 'bg-surface-container' : 'bg-surface';
  return (
    <div className={`${background} ${variantClasses[variant]} ${padding ? 'p-4' : ''} ${className}`} {...props}>
      {children}
    </div>
  );
}
