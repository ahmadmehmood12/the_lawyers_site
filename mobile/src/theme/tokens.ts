import { amber, gold, navy, red, verdant, white } from './palette';

/** Semantic colours for one mode. Screens and components only read these, never raw scales. */
export type ThemeColors = {
  bg: string; // app background
  surface: string; // cards, sheets
  surfaceAlt: string; // subtle panels, inputs
  surfaceInverse: string; // dark pill on light, etc.
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  textInverse: string;
  primary: string; // navy — primary actions, headers
  primaryText: string; // text/icon on primary
  primarySoft: string; // tinted navy surface
  accent: string; // gold — sparing accent
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
  bg: navy[50],
  surface: white,
  surfaceAlt: '#f7f9fc',
  surfaceInverse: navy[900],
  border: navy[100],
  borderStrong: navy[200],
  text: navy[900],
  textMuted: navy[500],
  textFaint: navy[400],
  textInverse: white,
  primary: navy[900],
  primaryText: white,
  primarySoft: navy[50],
  accent: gold[500],
  accentSoft: gold[50],
  accentText: gold[700],
  success: verdant[600],
  successSoft: verdant[50],
  warning: amber[600],
  warningSoft: amber[50],
  danger: red[600],
  dangerSoft: red[50],
  overlay: 'rgba(9,19,37,0.45)',
  shadow: '#0f1e36',
};

export const darkColors: ThemeColors = {
  bg: navy[950],
  surface: navy[900],
  surfaceAlt: navy[800],
  surfaceInverse: gold[500],
  border: navy[800],
  borderStrong: navy[700],
  text: '#eef2f8',
  textMuted: navy[300],
  textFaint: navy[400],
  textInverse: navy[950],
  primary: gold[500],
  primaryText: navy[950],
  primarySoft: 'rgba(184,137,43,0.12)',
  accent: gold[300],
  accentSoft: 'rgba(184,137,43,0.14)',
  accentText: gold[200],
  success: verdant[300],
  successSoft: 'rgba(40,146,95,0.16)',
  warning: amber[400],
  warningSoft: 'rgba(217,119,6,0.16)',
  danger: red[400],
  dangerSoft: 'rgba(220,38,38,0.16)',
  overlay: 'rgba(0,0,0,0.6)',
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  '2xl': 26,
  '3xl': 32,
} as const;

/** Inter is the UI face; Source Serif is used for big display headings (matches the web). */
export const fontFamily = {
  // System fonts keep the prototype installable without bundling font files.
  sans: undefined as string | undefined,
  serif: undefined as string | undefined,
};
