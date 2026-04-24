import { Platform } from 'react-native';

type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

const warmShadow = (height: number, radius: number, opacity: number, elevation: number): Shadow => ({
  shadowColor: '#2A1F1A',
  shadowOffset: { width: 0, height },
  shadowOpacity: opacity,
  shadowRadius: radius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  none: warmShadow(0, 0, 0, 0),
  sm: warmShadow(1, 2, 0.08, 1),
  md: warmShadow(4, 8, 0.10, 3),
  lg: warmShadow(8, 20, 0.14, 6),
  xl: warmShadow(16, 36, 0.18, 12),
} as const;

export const shadowsDark = {
  none: warmShadow(0, 0, 0, 0),
  sm: { ...warmShadow(1, 2, 0.3, 1), shadowColor: '#000' },
  md: { ...warmShadow(4, 8, 0.4, 3), shadowColor: '#000' },
  lg: { ...warmShadow(8, 20, 0.5, 6), shadowColor: '#000' },
  xl: { ...warmShadow(16, 36, 0.6, 12), shadowColor: '#000' },
} as const;

export type ShadowKey = keyof typeof shadows;
