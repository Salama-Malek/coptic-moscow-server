import { CSSProperties, ReactNode } from 'react';

type Props = {
  children: ReactNode;
  onClick?: () => void;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  goldAccent?: boolean;
  style?: CSSProperties;
  className?: string;
};

const PAD: Record<NonNullable<Props['padding']>, string> = {
  sm: 'var(--space-md)',
  md: 'var(--space-lg)',
  lg: 'var(--space-xl)',
  xl: 'var(--space-2xl)',
};

const SHADOW: Record<NonNullable<Props['elevation']>, string> = {
  none: 'none',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
};

export function Card({
  children,
  onClick,
  padding = 'md',
  elevation = 'sm',
  goldAccent = false,
  style,
  className,
}: Props) {
  const isInteractive = !!onClick;
  const Tag = isInteractive ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={className}
      style={{
        position: 'relative',
        background: 'var(--color-surface)',
        color: 'var(--color-ink)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: PAD[padding],
        boxShadow: SHADOW[elevation],
        textAlign: 'start',
        font: 'inherit',
        width: '100%',
        cursor: isInteractive ? 'pointer' : undefined,
        transition: 'transform var(--duration-micro) var(--easing-standard), box-shadow var(--duration-short) var(--easing-standard)',
        ...style,
      }}
    >
      {goldAccent && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'var(--color-gold)',
            borderTopLeftRadius: 'var(--radius-md)',
            borderTopRightRadius: 'var(--radius-md)',
          }}
        />
      )}
      {children}
    </Tag>
  );
}
