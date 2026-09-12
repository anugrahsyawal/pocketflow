import { ReactNode, useId, useLayoutEffect, useRef } from 'react';

let openDialogs = 0;
let previousOverflow = '';

interface DialogFrameProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  sheet?: boolean;
}

/** Native modal semantics keep background controls inert and trap keyboard focus. */
export function DialogFrame({ isOpen, onClose, title, children, sheet = false }: DialogFrameProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    if (!isOpen || !ref.current) return;
    const dialog = ref.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (openDialogs++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialog.showModal();
    return () => {
      dialog.close();
      if (--openDialogs === 0) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={title ? titleId : undefined}
      aria-label={title ? undefined : 'Dialog PocketFlow'}
      className={`app-dialog justify-center ${sheet ? 'items-end !p-0' : 'items-center'}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        )).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={`relative w-full min-h-0 flex flex-col bg-surface ${sheet
        ? 'max-w-app max-h-[90dvh] rounded-t-pocket shadow-sheet animate-slide-up'
        : 'max-w-[360px] max-h-[85dvh] rounded-card shadow-elevated animate-scale-in'}`}>
        {sheet && <div aria-hidden="true" className="w-10 h-1 rounded-full bg-outline-variant/60 mx-auto mt-3 mb-1 shrink-0" />}
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2 shrink-0">
          {title ? <h2 id={titleId} className="font-display text-headline-sm">{title}</h2> : <span />}
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="w-11 h-11 shrink-0 rounded-full bg-surface-container-low text-text-secondary hover:bg-surface-container flex items-center justify-center">
            <span aria-hidden="true" className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </dialog>
  );
}
