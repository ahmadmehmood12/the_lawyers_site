import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import type { FirmCard as Firm } from '@/api';
import { useTheme } from '@/theme';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { Txt } from './Txt';

/** Law firm card with its focus practice areas. */
export function FirmCard({ firm, onPress, compact }: { firm: Firm; onPress?: () => void; compact?: boolean }) {
  const { c, spacing, radius } = useTheme();
  return (
    <Card onPress={onPress} style={compact ? { width: 240 } : undefined}>
      <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
        <Avatar name={firm.name} uri={firm.logo_url} size={46} tone="neutral" />
        <View style={{ flex: 1 }}>
          <Txt variant="subtitle" numberOfLines={1}>{firm.name}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 2 }}>
            {firm.city ? <Txt variant="caption" tone="muted"><Feather name="map-pin" size={11} /> {firm.city}</Txt> : null}
            <Txt variant="caption" tone="muted"><Feather name="users" size={11} /> {firm.members} lawyers</Txt>
          </View>
        </View>
      </View>
      {!compact && firm.excerpt ? <Txt variant="label" tone="muted" weight="400" numberOfLines={2} style={{ marginTop: spacing.sm }}>{firm.excerpt}</Txt> : null}
      {firm.focus.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
          {firm.focus.slice(0, compact ? 2 : 4).map((f) => (
            <View key={f} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.primarySoft }}>
              <Txt variant="caption" tone="accent" weight="600">{f}</Txt>
            </View>
          ))}
        </View>
      ) : null}
    </Card>
  );
}
