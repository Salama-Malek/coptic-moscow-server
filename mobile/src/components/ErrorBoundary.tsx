import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import i18n from '../lib/i18n';

// Catches render errors in any descendant screen. Shows a localized fallback
// with a reload-app action so the user isn't stuck on a white screen. Logs to
// console for dev; hook Sentry capture here once OB3 ships.

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
    // TODO (OB3): Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
  }

  handleReset = (): void => {
    // Clear the error so children re-render. If the same render keeps throwing
    // the boundary will immediately re-catch, which is fine — user sees the
    // fallback again and at least isn't forced to kill the app.
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      const t = i18n.t.bind(i18n);
      return (
        <View style={styles.container}>
          <Text style={styles.title}>
            {t('error_boundary_title', { defaultValue: 'Something went wrong' })}
          </Text>
          <Text style={styles.body}>
            {t('error_boundary_body', { defaultValue: 'The app hit an unexpected error. Try again.' })}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>
              {t('error_boundary_reload', { defaultValue: 'Try again' })}
            </Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

// Intentionally hardcoded theme values — this boundary must render even if
// ThemeProvider itself has crashed, so useTheme() is unsafe here. Values
// mirror the Parchment & Iconostasis light theme.
const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: '#f8f5ee',
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12, color: '#2b2a28', textAlign: 'center' },
  body: { fontSize: 16, color: '#5a5751', marginBottom: 24, textAlign: 'center', lineHeight: 22 },
  button: {
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 8,
    backgroundColor: '#8c6c3f',
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
});
