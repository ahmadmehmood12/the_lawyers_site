/**
 * Raw colour scales, copied from the web app's design system ("Chambers",
 * resources/css/app.css) so the mobile app shares one visual identity:
 * navy = authority, verdant = confirmations, gold = a sparing accent.
 */
export const navy = {
  50: '#f2f5fa',
  100: '#e1e8f2',
  200: '#c3d0e3',
  300: '#97abc9',
  400: '#6580a9',
  500: '#45628d',
  600: '#344c72',
  700: '#283c5c',
  800: '#1b2b45',
  900: '#0f1e36',
  950: '#091325',
} as const;

export const verdant = {
  50: '#effaf3',
  100: '#d8f2e1',
  200: '#b2e3c5',
  300: '#7fcda2',
  400: '#4aaf7b',
  500: '#28925f',
  600: '#1b754b',
  700: '#165d3e',
  800: '#134a33',
  900: '#103d2b',
} as const;

export const gold = {
  50: '#fbf7ec',
  100: '#f4eacb',
  200: '#e9d596',
  300: '#dcbb5f',
  400: '#cfa33b',
  500: '#b8892b',
  600: '#966a22',
  700: '#774f1f',
} as const;

export const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  400: '#fbbf24',
  600: '#d97706',
  900: '#78350f',
} as const;

export const red = {
  50: '#fef2f2',
  100: '#fee2e2',
  400: '#f87171',
  500: '#ef4444',
  600: '#dc2626',
  800: '#991b1b',
} as const;

export const white = '#ffffff';
export const black = '#000000';
