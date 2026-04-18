export const motion = {
  duration: {
    instant: '100ms',
    micro: '150ms',
    short: '200ms',
    medium: '300ms',
    long: '450ms',
  },
  easing: {
    standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  },
} as const;
