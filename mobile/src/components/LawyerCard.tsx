import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import type { LawyerCard as Lawyer } from '@/api';
import { formatPkr } from '@/lib/format';
import { useTheme } from '@/theme';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { Txt } from './Txt';

/** Directory card: photo, verified tick, headline, practice areas, city, experience, fee, rating. */
export function LawyerCard({ lawyer, onPress, compact }: { lawyer: Lawyer; onPress?: () => void; compact?: boolean }) {
  const { c, spacing, radius } = useTheme();
  const areas = lawyer.specializations.slice(0, compact ? 2 : 3);
  const more = lawyer.specializations.length - areas.length;

  return (
    <Card onPress={onPress} style={compact ? { width: 260 } : undefined}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Avatar name={lawyer.name} uri={lawyer.photo_url} size={compact ? 48 : 56} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>{lawyer.name}</Txt>
            {lawyer.verified ? <Feather name="check-circle" size={15} color={c.success} accessibilityLabel="Verified" /> : null}
          </View>
          {lawyer.headline ? <Txt variant="label" tone="muted" numberOfLines={1} weight="500">{lawyer.headline}</Txt> : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 2 }}>
            {lawyer.city ? <Meta icon="map-pin" text={lawyer.city} /> : null}
            {lawyer.years_experience ? <Meta icon="award" text={`${lawyer.years_experience} yrs`} /> : null}
            {lawyer.rating ? <Meta icon="star" text={`${lawyer.rating.toFixed(1)} (${lawyer.rating_count})`} /> : null}
          </View>
        </View>
      </View>
      {areas.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
          {areas.map((s) => (
            <View key={s.slug} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: c.primarySoft }}>
              <Txt variant="caption" tone="accent" weight="600">{s.name}</Txt>
            </View>
          ))}
          {more > 0 ? <Txt variant="caption" tone="faint" style={{ alignSelf: 'center' }}>+{more} more</Txt> : null}
        </View>
      ) : null}
      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border }}>
          <Txt variant="label" tone="muted" weight="500">
            {lawyer.fee_min ? `From ${formatPkr(lawyer.fee_min)}` : 'Fee on request'}
            {lawyer.offers_online ? '  ·  Online' : ''}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Txt variant="label" tone="primary">View profile</Txt>
            <Feather name="arrow-right" size={14} color={c.primary} />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Feather.glyphMap; text: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Feather name={icon} size={12} color={c.textFaint} />
      <Txt variant="caption" tone="muted">{text}</Txt>
    </View>
  );
}
