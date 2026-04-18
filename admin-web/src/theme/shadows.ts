export type ShadowSet = {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  focus: string;
};

export const shadows: ShadowSet = {
  none: 'none',
  sm: '0 1px 2px rgba(42, 31, 26, 0.08)',
  md: '0 4px 12px rgba(42, 31, 26, 0.10)',
  lg: '0 12px 32px rgba(42, 31, 26, 0.14)',
  xl: '0 24px 48px rgba(42, 31, 26, 0.18)',
  focus: '0 0 0 3px rgba(201, 162, 74, 0.4)',
};

export const shadowsDark: ShadowSet = {
  none: 'none',
  sm: '0 1px 2px rgba(0, 0, 0, 0.3)',
  md: '0 4px 12px rgba(0, 0, 0, 0.4)',
  lg: '0 12px 32px rgba(0, 0, 0, 0.5)',
  xl: '0 24px 48px rgba(0, 0, 0, 0.6)',
  focus: '0 0 0 3px rgba(201, 162, 74, 0.5)',
};

export type ShadowKey = keyof ShadowSet;
