import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
};

/** Filter / selectable chip. */
export function Chip({ label, selected, onPress, icon }: Props) {
  const { c, radius, spacing } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? c.primary : c.surface,
          borderColor: selected ? c.primary : c.border,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {icon ? <Feather name={icon} size={13} color={selected ? c.primaryText : c.textMuted} style={{ marginRight: 4 }} /> : null}
      <Txt variant="caption" weight="600" style={{ color: selected ? c.primaryText : c.textMuted }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({ chip: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth } });
