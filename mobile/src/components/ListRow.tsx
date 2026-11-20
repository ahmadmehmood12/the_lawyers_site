import { Feather } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  divider?: boolean;
};

/** A compact, tappable row — the mobile replacement for a table row. */
export function ListRow({ title, subtitle, meta, leading, trailing, onPress, chevron, divider }: Props) {
  const { c, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: spacing.md, opacity: pressed && onPress ? 0.65 : 1 },
        divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border },
      ]}
    >
      {leading ? <View style={{ marginRight: spacing.md }}>{leading}</View> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="body" weight="600" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" tone="muted" numberOfLines={2} style={{ marginTop: 2 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {meta ? (
        <Txt variant="caption" tone="faint" style={{ marginLeft: spacing.sm }}>
          {meta}
        </Txt>
      ) : null}
      {trailing}
      {chevron ? <Feather name="chevron-right" size={18} color={c.textFaint} style={{ marginLeft: spacing.xs }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' } });
