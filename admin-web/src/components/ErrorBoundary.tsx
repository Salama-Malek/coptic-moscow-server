import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';

// Catches render errors from any descendant. Shows a localized fallback with a
// reload button so Abouna isn't staring at a white screen. Logs to console for
// dev; once Sentry is wired in (OB3), capture the error here too.

interface State {
  error: Error | null;
}

class ErrorBoundaryInner extends React.Component<React.PropsWithChildren<WithTranslation>, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // TODO (OB3): Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.error) {
      const { t } = this.props;
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '2rem', fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          background: 'var(--color-bg, #f8f5ee)', color: 'var(--color-text, #2b2a28)',
        }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>
              {t('error_boundary_title', 'Something went wrong')}
            </h1>
            <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
              {t('error_boundary_body', 'The page hit an unexpected error. Try reloading.')}
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: '0.6rem 1.4rem', fontSize: '1rem', borderRadius: '0.5rem',
                border: 'none', background: 'var(--color-primary, #8c6c3f)',
                color: 'white', cursor: 'pointer',
              }}
            >
              {t('error_boundary_reload', 'Reload')}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ErrorBoundary = withTranslation()(ErrorBoundaryInner);
