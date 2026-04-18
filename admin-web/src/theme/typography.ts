export const typography = {
  display: { fontSize: '2rem', lineHeight: '2.5rem', letterSpacing: '-0.02em' },
  h1: { fontSize: '1.5rem', lineHeight: '2rem', letterSpacing: '-0.01em' },
  h2: { fontSize: '1.25rem', lineHeight: '1.75rem', letterSpacing: '-0.005em' },
  h3: { fontSize: '1.125rem', lineHeight: '1.625rem' },
  body: { fontSize: '1rem', lineHeight: '1.5rem' },
  bodySmall: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  caption: { fontSize: '0.75rem', lineHeight: '1rem', letterSpacing: '0.02em' },
  overline: { fontSize: '0.6875rem', lineHeight: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
} as const;

export type TypographyKey = keyof typeof typography;
