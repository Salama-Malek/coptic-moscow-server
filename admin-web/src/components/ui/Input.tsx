import { CSSProperties, forwardRef, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, useId } from 'react';
import type { LucideIcon } from 'lucide-react';

type BaseProps = {
  label?: string;
  error?: string;
  helper?: string;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  trailingAdornment?: ReactNode;
  containerStyle?: CSSProperties;
};

type InputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    helper,
    leadingIcon: LeadingIcon,
    trailingIcon: TrailingIcon,
    trailingAdornment,
    containerStyle,
    id,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          paddingInline: '12px',
          minHeight: '40px',
          transition: 'border-color var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-gold)';
          e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {LeadingIcon && <LeadingIcon size={16} strokeWidth={1.75} color="var(--color-ink-muted)" />}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error || helper ? helperId : undefined}
          {...rest}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'var(--color-ink)',
            fontSize: '16px',
            fontFamily: 'inherit',
            padding: '10px 0',
            minWidth: 0,
            ...(rest.style || {}),
          }}
        />
        {trailingAdornment ?? (TrailingIcon && <TrailingIcon size={16} strokeWidth={1.75} color="var(--color-ink-muted)" />)}
      </div>
      {(error || helper) && (
        <span
          id={helperId}
          style={{
            fontSize: '12px',
            color: error ? 'var(--color-error)' : 'var(--color-ink-muted)',
          }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
});

type TextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, helper, containerStyle, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const helperId = `${inputId}-helper`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', ...containerStyle }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--color-ink)',
            letterSpacing: '0.2px',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error || helper ? helperId : undefined}
        {...rest}
        style={{
          background: 'var(--color-white)',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--color-border)'}`,
          padding: '12px',
          color: 'var(--color-ink)',
          fontSize: '16px',
          fontFamily: 'inherit',
          lineHeight: 1.5,
          minHeight: '96px',
          resize: 'vertical',
          outline: 'none',
          transition: 'border-color var(--duration-micro) var(--easing-standard), box-shadow var(--duration-micro) var(--easing-standard)',
          ...(rest.style || {}),
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-gold)';
          e.currentTarget.style.boxShadow = 'var(--shadow-focus)';
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-border)';
          e.currentTarget.style.boxShadow = 'none';
          rest.onBlur?.(e);
        }}
      />
      {(error || helper) && (
        <span
          id={helperId}
          style={{
            fontSize: '12px',
            color: error ? 'var(--color-error)' : 'var(--color-ink-muted)',
          }}
        >
          {error || helper}
        </span>
      )}
    </div>
  );
});
