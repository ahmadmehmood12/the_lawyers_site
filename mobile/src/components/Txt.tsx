import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFor, useTheme } from '@/theme';

type Variant = 'display' | 'title' | 'heading' | 'subtitle' | 'body' | 'label' | 'caption';
type Tone = 'default' | 'muted' | 'faint' | 'inverse' | 'primary' | 'accent' | 'success' | 'danger' | 'warning';

const SIZES: Record<Variant, { size: keyof ReturnType<typeof useTheme>['fontSize']; weight: TextStyle['fontWeight']; lineHeight?: number }> = {
  display: { size: '3xl', weight: '800', lineHeight: 38 },
  title: { size: '2xl', weight: '800', lineHeight: 32 },
  heading: { size: 'xl', weight: '700', lineHeight: 28 },
  subtitle: { size: 'lg', weight: '600', lineHeight: 24 },
  body: { size: 'base', weight: '400', lineHeight: 21 },
  label: { size: 'sm', weight: '600', lineHeight: 18 },
  caption: { size: 'xs', weight: '500', lineHeight: 15 },
};

export type TxtProps = TextProps & {
  variant?: Variant;
  tone?: Tone;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
};

/** Themed Text: one place for the app's type scale, weights and colours. */
export function Txt({ variant = 'body', tone = 'default', weight, center, style, ...rest }: TxtProps) {
  const { c, fontSize } = useTheme();
  const spec = SIZES[variant];
  const color = {
    default: c.text,
    muted: c.textMuted,
    faint: c.textFaint,
    inverse: c.textInverse,
    primary: c.primary,
    accent: c.accentText,
    success: c.success,
    danger: c.danger,
    warning: c.warning,
  }[tone];

  const resolvedWeight = StyleSheet.flatten(style)?.fontWeight ?? weight ?? spec.weight;

  return (
    <Text
      style={[
        { color, fontSize: fontSize[spec.size], fontFamily: fontFor(resolvedWeight), lineHeight: spec.lineHeight, letterSpacing: variant === 'display' || variant === 'title' ? -0.4 : 0 },
        center && { textAlign: 'center' },
        style,
        { fontWeight: undefined },
      ]}
      {...rest}
    />
  );
}
