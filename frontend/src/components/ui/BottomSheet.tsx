import { ReactNode } from 'react';
import { DialogFrame } from './DialogFrame';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  return (
    <DialogFrame isOpen={isOpen} onClose={onClose} title={title} sheet>{children}</DialogFrame>
  );
}
