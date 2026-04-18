import { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-2xl) var(--space-xl)',
        textAlign: 'center',
      }}
    >
      {Icon && (
        <div
          style={{
            width: '88px',
            height: '88px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          <Icon size={36} strokeWidth={1.5} color="var(--color-gold)" />
        </div>
      )}
      <h3
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 700,
          color: 'var(--color-ink)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'var(--color-ink-muted)',
            maxWidth: '420px',
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 'var(--space-md)' }}>{action}</div>}
    </div>
  );
}
