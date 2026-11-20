import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** iOS-style segmented tabs for switching views within a screen. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { c, radius, spacing } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: 3 }]}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.seg, { borderRadius: radius.sm, paddingVertical: spacing.sm, backgroundColor: active ? c.surface : 'transparent' }, active && styles.shadow]}
          >
            <Txt variant="label" style={{ color: active ? c.text : c.textMuted }} numberOfLines={1}>
              {opt.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row' },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shadow: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
});
