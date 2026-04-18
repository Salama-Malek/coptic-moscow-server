import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  dismissLabel?: string;
};

const WIDTH: Record<NonNullable<Props['size']>, string> = {
  sm: '420px',
  md: '560px',
  lg: '720px',
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
  dismissLabel = 'Close',
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--color-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-lg)',
        zIndex: 1000,
        animation: 'modal-fade-in var(--duration-medium) var(--easing-standard)',
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: WIDTH[size],
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-parchment)',
          color: 'var(--color-ink)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          outline: 'none',
          animation: 'modal-slide-up var(--duration-medium) var(--easing-spring)',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-lg) var(--space-xl)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={dismissLabel}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-ink-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} strokeWidth={1.75} />
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--space-xl)', overflow: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
