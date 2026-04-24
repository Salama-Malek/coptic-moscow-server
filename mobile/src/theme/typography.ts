export const typography = {
  display: { fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontSize: 24, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontSize: 20, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontSize: 18, lineHeight: 26, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 24, letterSpacing: 0 },
  bodySmall: { fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' as const },
} as const;

export type TypographyKey = keyof typeof typography;
