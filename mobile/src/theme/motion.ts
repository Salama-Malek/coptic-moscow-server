import { Easing } from 'react-native';

export const motion = {
  duration: {
    instant: 100,
    micro: 150,
    short: 200,
    medium: 300,
    long: 450,
  },
  easing: {
    standard: Easing.bezier(0.32, 0.72, 0, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
    spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  },
} as const;
