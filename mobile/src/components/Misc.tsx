import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

/** Hairline divider. */
export function Divider({ style }: { style?: ViewStyle }) {
  const { c } = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }, style]} />;
}

/** Thin progress bar (case progress, profile completeness, OCR status, etc.). */
export function ProgressBar({ value, tone = 'accent' }: { value: number; tone?: 'accent' | 'success' | 'primary' }) {
  const { c, radius } = useTheme();
  const fill = tone === 'success' ? c.success : tone === 'primary' ? c.primary : c.accent;
  return (
    <View style={{ height: 6, borderRadius: radius.pill, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, value))}%`, height: '100%', backgroundColor: fill, borderRadius: radius.pill }} />
    </View>
  );
}

/** Round, tappable icon button for headers and toolbars. */
export function IconButton({ icon, onPress, tone = 'default', badge }: { icon: keyof typeof Feather.glyphMap; onPress?: () => void; tone?: 'default' | 'onPrimary'; badge?: boolean }) {
  const { c, spacing } = useTheme();
  const color = tone === 'onPrimary' ? c.primaryText : c.text;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => [{ padding: spacing.xs, opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={22} color={color} />
      {badge ? <View style={[styles.dot, { backgroundColor: c.danger, borderColor: tone === 'onPrimary' ? c.primary : c.bg }]} /> : null}
    </Pressable>
  );
}

/** A label/value pair used on detail screens. */
export function KeyValue({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { c, spacing } = useTheme();
  return (
    <View style={{ paddingVertical: spacing.md, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: c.border }}>
      <Txt variant="caption" tone="faint">
        {label}
      </Txt>
      <Txt variant="body" weight="500" style={{ marginTop: 2 }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', top: 2, right: 2, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
});
