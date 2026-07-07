import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: ReactNode;
  transparent?: boolean;
}

export function TopBar({ title, showBack = false, onBack, rightAction, transparent = false }: TopBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 flex items-center h-14 px-safe gap-2 ${
        transparent ? 'bg-transparent' : 'bg-background/80 backdrop-blur-md'
      }`}
    >
      {showBack && (
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 -ml-1 rounded-full hover:bg-surface-container transition-colors"
          aria-label="Kembali"
        >
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
      )}

      {title && (
        <h1 className="flex-1 font-display text-headline-sm text-text-primary truncate">
          {title}
        </h1>
      )}

      {!title && <div className="flex-1" />}

      {rightAction && <div className="flex items-center">{rightAction}</div>}
    </header>
  );
}
