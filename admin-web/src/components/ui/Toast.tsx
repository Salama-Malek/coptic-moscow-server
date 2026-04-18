import { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, type LucideIcon } from 'lucide-react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

type Props = {
  kind?: ToastKind;
  message: string;
  open: boolean;
  onClose?: () => void;
  duration?: number;
};

const ICONS: Record<ToastKind, LucideIcon> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

function paletteFor(kind: ToastKind) {
  switch (kind) {
    case 'success':
      return { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', border: 'var(--color-success)' };
    case 'error':
      return { bg: 'var(--color-error-soft)', fg: 'var(--color-error)', border: 'var(--color-error)' };
    case 'warning':
      return { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', border: 'var(--color-warning)' };
    case 'info':
      return { bg: 'var(--color-surface)', fg: 'var(--color-ink)', border: 'var(--color-border)' };
  }
}

export function Toast({
  kind = 'info',
  message,
  open,
  onClose,
  duration = 3000,
}: Props) {
  useEffect(() => {
    if (!open || !onClose || duration <= 0) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, onClose, duration]);

  if (!open) return null;

  const palette = paletteFor(kind);
  const Icon = ICONS[kind];

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'var(--space-lg)',
        insetInlineEnd: 'var(--space-lg)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        maxWidth: '360px',
        zIndex: 1100,
        fontSize: '14px',
        animation: 'toast-slide-in var(--duration-medium) var(--easing-spring)',
      }}
    >
      <Icon size={18} strokeWidth={1.75} />
      <span style={{ flex: 1 }}>{message}</span>
    </div>
  );
}
