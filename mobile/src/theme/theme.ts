import { colors, colorsDark } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows, shadowsDark } from './shadows';
import { motion } from './motion';

export type Theme = {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  motion: typeof motion;
  isDark: boolean;
};

export const lightTheme: Theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
  isDark: false,
};

export const darkTheme: Theme = {
  colors: colorsDark,
  typography,
  spacing,
  radius,
  shadows: shadowsDark,
  motion,
  isDark: true,
};
