import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Card } from './Card';
import { Txt } from './Txt';

type Props = {
  value: string | number;
  label: string;
  delta?: string;
  deltaTone?: 'success' | 'danger' | 'muted';
  icon?: keyof typeof Feather.glyphMap;
};

/** A figure with a label (tabular), per the web design rule: no decorative icon tiles. */
export function Stat({ value, label, delta, deltaTone = 'muted', icon }: Props) {
  const { c, spacing } = useTheme();
  const dc = deltaTone === 'success' ? c.success : deltaTone === 'danger' ? c.danger : c.textFaint;

  return (
    <Card style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Txt variant="caption" tone="muted" numberOfLines={1}>
          {label}
        </Txt>
        {icon ? <Feather name={icon} size={15} color={c.textFaint} /> : null}
      </View>
      <Txt variant="title" style={{ marginTop: spacing.sm, fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      {delta ? (
        <Txt variant="caption" weight="600" style={{ color: dc, marginTop: 2 }}>
          {delta}
        </Txt>
      ) : null}
    </Card>
  );
}
