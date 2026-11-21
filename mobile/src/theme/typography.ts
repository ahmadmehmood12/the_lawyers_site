import type { TextStyle } from 'react-native';

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

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const lineHeight = {
  tight: 1.15,
  normal: 1.45,
  relaxed: 1.6,
} as const;

/** Plus Jakarta Sans families, loaded in App.tsx (@expo-google-fonts/plus-jakarta-sans). */
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

/** Custom fonts ship one file per weight, so pick the family from the weight (Android ignores fontWeight). */
export function fontFor(weight: TextStyle['fontWeight'] | undefined): string {
  switch (String(weight ?? '400')) {
    case '500':
    case 'medium':
      return fontFamily.medium;
    case '600':
    case 'semibold':
      return fontFamily.semibold;
    case '700':
    case 'bold':
      return fontFamily.bold;
    case '800':
    case '900':
    case 'heavy':
    case 'black':
      return fontFamily.extrabold;
    default:
      return fontFamily.regular;
  }
}
