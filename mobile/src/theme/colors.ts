/**
 * Brand palette: deep forest green #0f2c1e on white (docs/DESIGN_SYSTEM.md).
 * `navy`, `gold` and `verdant` keep their names so existing components work, but every
 * scale is now a tint of the brand green — there is no blue or gold left in the UI.
 */
export const forest = {
  50: '#eef5f1',
  100: '#d7e7de',
  200: '#b1d0bf',
  300: '#84b29a',
  400: '#548f72',
  500: '#2f6f51',
  600: '#215a40',
  700: '#194732',
  800: '#143a28',
  900: '#0f2c1e',
  950: '#08180f',
} as const;

export const navy = forest;

export const verdant = {
  50: '#ecf8f1',
  100: '#d3efdf',
  200: '#a7dfc0',
  300: '#6fc79a',
  400: '#3fa874',
  500: '#23895a',
  600: '#1a6e48',
  700: '#165a3c',
  800: '#134832',
  900: '#103b2a',
} as const;

/** Accent = the brand green's lighter tones (kept as `gold` for compatibility). */
export const gold = {
  50: forest[50],
  100: forest[100],
  200: forest[200],
  300: forest[300],
  400: forest[400],
  500: forest[600],
  600: forest[700],
  700: forest[800],
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
export const brand = forest[900];

export type ThemeColors = {
  bg: string;
  surface: string;
  surfaceAlt: string;
  surfaceInverse: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
};

export const lightColors: ThemeColors = {
  bg: white,
  surface: white,
  surfaceAlt: '#f5f8f6',
  surfaceInverse: forest[900],
  border: '#e4ebe7',
  borderStrong: forest[100],
  text: forest[900],
  textMuted: '#5a6f64',
  textFaint: '#8a9b92',
  textInverse: white,
  primary: forest[900],
  primaryText: white,
  primarySoft: forest[50],
  accent: forest[600],
  accentSoft: forest[50],
  accentText: forest[700],
  success: verdant[600],
  successSoft: verdant[50],
  warning: amber[600],
  warningSoft: amber[50],
  danger: red[600],
  dangerSoft: red[50],
  overlay: 'rgba(8,24,15,0.5)',
  shadow: forest[950],
};

export const darkColors: ThemeColors = {
  bg: forest[950],
  surface: '#0d2419',
  surfaceAlt: forest[900],
  surfaceInverse: white,
  border: '#173a29',
  borderStrong: forest[700],
  text: '#f1f6f3',
  textMuted: forest[200],
  textFaint: forest[300],
  textInverse: forest[950],
  primary: white,
  primaryText: forest[900],
  primarySoft: 'rgba(255,255,255,0.08)',
  accent: forest[200],
  accentSoft: 'rgba(177,208,191,0.12)',
  accentText: forest[100],
  success: verdant[300],
  successSoft: 'rgba(35,137,90,0.18)',
  warning: amber[400],
  warningSoft: 'rgba(217,119,6,0.16)',
  danger: red[400],
  dangerSoft: 'rgba(220,38,38,0.16)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: black,
};
