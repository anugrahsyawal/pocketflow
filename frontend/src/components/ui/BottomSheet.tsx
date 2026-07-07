import { ReactNode, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-inverse-surface/40 animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-app bg-surface rounded-t-pocket shadow-sheet animate-slide-up">
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-outline-variant rounded-full" />
        </div>
        {title && (
          <div className="px-safe pb-3">
            <h2 className="font-display text-headline-sm text-text-primary">{title}</h2>
          </div>
        )}
        <div className="px-safe pb-safe">{children}</div>
      </div>
    </div>
  );
}
