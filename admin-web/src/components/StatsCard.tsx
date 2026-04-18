import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  accent?: 'primary' | 'gold' | 'success';
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'primary',
}: StatsCardProps) {
  const accentColor =
    accent === 'gold'
      ? 'var(--color-gold)'
      : accent === 'success'
      ? 'var(--color-success)'
      : 'var(--color-primary)';

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          insetInlineStart: 0,
          width: '3px',
          height: '100%',
          background: accentColor,
        }}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div
          style={{
            color: 'var(--color-ink-muted)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </div>
        {Icon && <Icon size={16} strokeWidth={1.75} color={accentColor} />}
      </div>
      <div
        style={{
          color: 'var(--color-ink)',
          fontSize: '28px',
          fontWeight: 700,
          lineHeight: 1.1,
          marginTop: '4px',
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            color: 'var(--color-ink-faint)',
            fontSize: '11px',
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}
