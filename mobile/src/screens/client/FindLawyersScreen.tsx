import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Avatar, Badge, Card, Chip, EmptyState, Input, Screen, Txt } from '@/components';
import { lawyers, practiceAreas } from '@/data/mock';
import { formatPkrExact } from '@/lib/format';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function FindLawyersScreen() {
  const { c, spacing } = useTheme();
  const nav = useAppNavigation();
  const [query, setQuery] = useState('');
  const [area, setArea] = useState<string | null>(null);

  const list = lawyers.filter((lw) => {
    const matchesQuery = `${lw.name} ${lw.firm ?? ''} ${lw.city} ${lw.practiceAreas.join(' ')}`.toLowerCase().includes(query.toLowerCase());
    const matchesArea = !area || lw.practiceAreas.includes(area);
    return matchesQuery && matchesArea;
  });

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Find a lawyer
      </Txt>
      <Input icon="search" placeholder="Name, firm, city or practice area" value={query} onChangeText={setQuery} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.md }}>
        <Chip label="All" selected={!area} onPress={() => setArea(null)} />
        {practiceAreas.map((p) => (
          <Chip key={p} label={p} selected={area === p} onPress={() => setArea(area === p ? null : p)} />
        ))}
      </ScrollView>

      {list.length === 0 ? (
        <EmptyState icon="search" title="No lawyers match" message="Try a different practice area or search term." actionLabel="Clear filters" onAction={() => { setQuery(''); setArea(null); }} />
      ) : (
        <View style={{ gap: spacing.md }}>
          {list.map((lw) => (
            <Card key={lw.id} onPress={() => nav.navigate('LawyerProfile', { lawyerId: lw.id })}>
              <View style={{ flexDirection: 'row' }}>
                <Avatar name={lw.name} size={56} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Txt variant="subtitle" numberOfLines={1} style={{ flexShrink: 1 }}>
                      {lw.name}
                    </Txt>
                    {lw.verified ? <Feather name="check-circle" size={15} color={c.success} /> : null}
                  </View>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>
                    {lw.firm ? `${lw.firm} · ` : ''}{lw.city}
                  </Txt>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Feather name="star" size={13} color={c.accent} />
                      <Txt variant="caption" weight="600">
                        {lw.rating.toFixed(1)}
                      </Txt>
                      <Txt variant="caption" tone="faint">
                        ({lw.reviews})
                      </Txt>
                    </View>
                    <Txt variant="caption" tone="faint">
                      {lw.experienceYears} yrs
                    </Txt>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md }}>
                {lw.practiceAreas.slice(0, 3).map((p) => (
                  <Badge key={p} label={p} tone="info" />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
                <Txt variant="caption" tone="muted">
                  {lw.responseTime}
                </Txt>
                <Txt variant="label" tone="accent">
                  {formatPkrExact(lw.consultationFee)} / session
                </Txt>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
