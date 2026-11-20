import { Feather } from '@expo/vector-icons';
import { type RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';

import { Badge, Button, Card, EmptyState, Screen, SectionHeader, Stat, Txt } from '@/components';
import { lawyers } from '@/data/mock';
import { formatPkrExact } from '@/lib/format';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export function LawyerProfileScreen() {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'LawyerProfile'>>();
  const lw = lawyers.find((l) => l.id === params.lawyerId);

  if (!lw) {
    return (
      <Screen>
        <EmptyState icon="user" title="Lawyer not found" />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title={`Book consultation · ${formatPkrExact(lw.consultationFee)}`} icon="calendar" onPress={() => nav.navigate('BookAppointment', { lawyerId: lw.id })} full />}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Txt variant="display" tone="primary">
            {lw.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md }}>
          <Txt variant="title">{lw.name}</Txt>
          {lw.verified ? <Feather name="check-circle" size={18} color={c.success} /> : null}
        </View>
        <Txt variant="body" tone="muted" style={{ marginTop: 2 }}>
          {lw.firm ?? 'Independent practice'} · {lw.city}
        </Txt>
        {lw.verified ? (
          <View style={{ marginTop: spacing.sm }}>
            <Badge label="Verified advocate" tone="success" />
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl }}>
        <Stat value={lw.rating.toFixed(1)} label="Rating" delta={`${lw.reviews} reviews`} />
        <Stat value={`${lw.experienceYears}`} label="Years" />
        <Stat value={formatPkrExact(lw.consultationFee).replace('Rs ', '₨')} label="Per session" />
      </View>

      <SectionHeader title="About" />
      <Txt variant="body" tone="muted" style={{ lineHeight: 22 }}>
        {lw.bio}
      </Txt>

      <SectionHeader title="Practice areas" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {lw.practiceAreas.map((p) => (
          <Badge key={p} label={p} tone="info" />
        ))}
      </View>

      <SectionHeader title="Courts" />
      <Card>
        {lw.courts.map((court, i) => (
          <View key={court} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: i === 0 ? 0 : undefined }}>
            <Feather name="home" size={16} color={c.textMuted} />
            <Txt variant="body">{court}</Txt>
          </View>
        ))}
      </Card>

      <SectionHeader title="Languages" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {lw.languages.map((lang) => (
          <Badge key={lang} label={lang} tone="neutral" />
        ))}
      </View>

      <SectionHeader title="Availability" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Feather name="clock" size={16} color={c.success} />
          <Txt variant="body">{lw.responseTime}</Txt>
        </View>
        <Txt variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          Mon–Sat, 10:00 AM – 6:00 PM · Online and in-person consultations
        </Txt>
      </Card>
    </Screen>
  );
}
