import { type ReactNode, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useDialog } from '@/hooks/useDialog';
import { cn } from '@/lib/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned below the scrolling body (e.g. Cancel / Save), so actions are never scrolled out of reach. */
  footer?: ReactNode;
  widthClassName?: string;
}

// Mounted only while the modal is open, so the dialog behaviour (focus in, Escape, Tab trap, focus
// back on close) starts and ends with each opening.
function ModalPanel({
  onClose,
  title,
  children,
  footer,
  widthClassName,
}: Omit<ModalProps, 'isOpen'>) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialog(panelRef, onClose);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        'flex max-h-[90vh] w-full flex-col rounded-xl bg-slate-100 shadow-xl ring-1 ring-white/10 focus:outline-none',
        widthClassName
      )}
      initial={{ opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 8 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-slate-500 transition-colors hover:text-slate-700"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
    </motion.div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer, widthClassName = 'max-w-lg' }: ModalProps) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <ModalPanel onClose={onClose} title={title} footer={footer} widthClassName={widthClassName}>
            {children}
          </ModalPanel>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
