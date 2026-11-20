import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: ViewStyle;
  tone?: 'surface' | 'primary' | 'accent';
};

/** The app's one card surface: soft border, gentle shadow, rounded corners. */
export function Card({ children, onPress, padded = true, style, tone = 'surface' }: Props) {
  const { c, radius, spacing, isDark } = useTheme();
  const bg = tone === 'primary' ? c.primary : tone === 'accent' ? c.accentSoft : c.surface;

  const content = (
    <View
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tone === 'primary' ? 'transparent' : c.border,
          padding: padded ? spacing.lg : 0,
        },
        !isDark &&
          tone !== 'primary' && {
            shadowColor: c.shadow,
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}
