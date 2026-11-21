import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'inverse';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, full, style }: Props) {
  const { c, radius, spacing, isDark } = useTheme();
  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 54 };
  const fonts: Record<Size, 'label' | 'body' | 'subtitle'> = { sm: 'label', md: 'body', lg: 'subtitle' };

  const bg = {
    primary: c.primary,
    accent: c.accent,
    danger: c.danger,
    secondary: c.surface,
    ghost: 'transparent',
    inverse: 'transparent',
  }[variant];
  const fg = {
    primary: c.primaryText,
    accent: isDark ? c.textInverse : '#ffffff',
    danger: '#ffffff',
    secondary: c.text,
    ghost: c.primary,
    inverse: '#ffffff',
  }[variant];
  const border = variant === 'secondary' ? c.borderStrong : undefined;

  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: heights[size],
          paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
          backgroundColor: bg,
          borderRadius: radius.md,
          borderWidth: border ? StyleSheet.hairlineWidth : 0,
          borderColor: border,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        full && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={size === 'sm' ? 15 : 18} color={fg} style={{ marginRight: spacing.sm }} /> : null}
          <Txt variant={fonts[size]} weight="600" style={{ color: fg }}>
            {title}
          </Txt>
          {iconRight ? <Feather name={iconRight} size={size === 'sm' ? 15 : 18} color={fg} style={{ marginLeft: spacing.sm }} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
