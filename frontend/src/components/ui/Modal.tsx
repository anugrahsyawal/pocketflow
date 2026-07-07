import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-safe">
      <div className="absolute inset-0 bg-inverse-surface/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-[360px] bg-surface rounded-card shadow-elevated animate-scale-in">
        {title && (
          <div className="px-6 pt-6 pb-2">
            <h2 className="font-display text-headline-sm text-text-primary">{title}</h2>
          </div>
        )}
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
