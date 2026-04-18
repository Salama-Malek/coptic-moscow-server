import { CSSProperties, forwardRef, ReactNode } from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  ariaLabel?: string;
  style?: CSSProperties;
  title?: string;
};

const HEIGHT: Record<ButtonSize, string> = { sm: '32px', md: '40px', lg: '48px' };
const PADDING_H: Record<ButtonSize, string> = { sm: '10px', md: '16px', lg: '20px' };
const FONT_SIZE: Record<ButtonSize, string> = { sm: '13px', md: '14px', lg: '15px' };
const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 18 };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    type = 'button',
    disabled = false,
    loading = false,
    fullWidth = false,
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    ariaLabel,
    style,
    title,
  },
  ref,
) {
  const palette = paletteFor(variant);

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: HEIGHT[size],
        paddingInline: PADDING_H[size],
        fontSize: FONT_SIZE[size],
        fontWeight: 600,
        fontFamily: 'inherit',
        borderRadius: 'var(--radius-md)',
        border: palette.border,
        background: palette.bg,
        color: palette.fg,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        width: fullWidth ? '100%' : undefined,
        transition: 'background var(--duration-micro) var(--easing-standard), transform var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
        boxShadow: variant === 'primary' ? 'var(--shadow-sm)' : 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
      onMouseDown={(e) => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'translateY(1px)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = variant === 'primary' ? 'var(--shadow-sm)' : 'none';
      }}
    >
      {loading ? (
        <Loader2 size={ICON_SIZE[size]} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <>
          {LeadingIcon && <LeadingIcon size={ICON_SIZE[size]} strokeWidth={1.75} />}
          <span>{children}</span>
          {TrailingIcon && <TrailingIcon size={ICON_SIZE[size]} strokeWidth={1.75} />}
        </>
      )}
    </button>
  );
});

function paletteFor(variant: ButtonVariant) {
  switch (variant) {
    case 'primary':
      return {
        bg: 'var(--color-primary)',
        fg: 'var(--color-white)',
        border: '1px solid var(--color-primary)',
      };
    case 'secondary':
      return {
        bg: 'var(--color-surface)',
        fg: 'var(--color-ink)',
        border: '1px solid var(--color-border)',
      };
    case 'ghost':
      return {
        bg: 'transparent',
        fg: 'var(--color-primary)',
        border: '1px solid transparent',
      };
    case 'destructive':
      return {
        bg: 'var(--color-error)',
        fg: 'var(--color-white)',
        border: '1px solid var(--color-error)',
      };
  }
}
