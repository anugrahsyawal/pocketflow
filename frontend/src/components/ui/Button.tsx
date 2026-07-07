import { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container active:bg-primary-container shadow-card',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-fixed active:bg-primary-fixed-dim',
  ghost: 'bg-transparent text-text-primary hover:bg-surface-container active:bg-surface-container-high',
  danger: 'bg-bahaya text-white hover:bg-bahaya/90 active:bg-bahaya/80',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-body-sm gap-1.5',
  md: 'h-11 px-6 text-body-lg gap-2',
  lg: 'h-14 px-8 text-body-lg font-semibold gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-pill font-body font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-rounded animate-spin text-xl">progress_activity</span>
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}
