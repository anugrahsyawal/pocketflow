import { ReactNode } from 'react';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';

interface TransactionConfirmationSheetProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  isProcessing?: boolean;
  onConfirm: () => void;
  onClose: () => void;
  children?: ReactNode;
}

export function TransactionConfirmationSheet({
  isOpen,
  title,
  description,
  confirmLabel,
  confirmVariant = 'primary',
  isProcessing = false,
  onConfirm,
  onClose,
  children,
}: TransactionConfirmationSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4 pb-4">
        <p className="text-body-sm text-text-secondary leading-relaxed">
          {description}
        </p>

        {children && (
          <div className="rounded-card bg-surface-container p-3 border border-border/30">
            {children}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={onConfirm}
            variant={confirmVariant}
            size="lg"
            fullWidth
            disabled={isProcessing}
            loading={isProcessing}
          >
            {confirmLabel}
          </Button>
          <Button
            onClick={onClose}
            variant="secondary"
            size="lg"
            fullWidth
            disabled={isProcessing}
          >
            Batal
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
