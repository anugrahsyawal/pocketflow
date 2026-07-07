import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: string;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = true, className = '', ...props }, ref) => {
    return (
      <div className={`flex flex-col gap-1.5 ${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label className="text-body-sm font-medium text-text-secondary">{label}</label>
        )}
        <div className="relative">
          {icon && (
            <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xl">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full h-12 bg-surface-container rounded-input text-body-lg text-text-primary border border-transparent focus:border-primary focus:ring-0 focus:outline-none placeholder:text-text-muted transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${icon ? 'pl-10 pr-4' : 'px-4'} ${error ? 'border-bahaya' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <span className="text-body-sm text-bahaya flex items-center gap-1">
            <span className="material-symbols-rounded text-sm">error</span>
            {error}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
