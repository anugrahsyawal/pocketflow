import { ReactNode } from 'react';
import { DialogFrame } from './DialogFrame';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <DialogFrame isOpen={isOpen} onClose={onClose} title={title}>{children}</DialogFrame>
  );
}
