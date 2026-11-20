import { Feather } from '@expo/vector-icons';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Badge, Card, EmptyState, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { cases, currentLawyerName, hearings } from '@/data/mock';
import { formatDate, to12h, weekday } from '@/lib/format';
import { label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

/** Court diary: upcoming hearings grouped by date. A lawyer sees their own cause list; a firm sees everyone's. */
export function CourtDiaryScreen() {
  const { c, spacing, radius } = useTheme();
  const nav = useAppNavigation();
  const { user } = useAuth();

  const myCaseIds = cases.filter((cs) => user?.role === 'firm' || cs.lawyers.includes(currentLawyerName)).map((cs) => cs.id);
  const upcoming = hearings.filter((h) => myCaseIds.includes(h.caseId) && h.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const grouped = useMemo(() => {
    const map = new Map<string, typeof upcoming>();
    for (const h of upcoming) {
      map.set(h.date, [...(map.get(h.date) ?? []), h]);
    }
    return [...map.entries()];
  }, [upcoming]);

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        Court diary
      </Txt>

      {grouped.length === 0 ? (
        <EmptyState icon="calendar" title="No upcoming hearings" message="Your scheduled hearings and their cause list will appear here." />
      ) : (
        grouped.map(([date, items]) => (
          <View key={date} style={{ marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
              <View style={{ width: 46, height: 46, borderRadius: radius.md, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="caption" tone="primary" weight="700">
                  {weekday(date).toUpperCase()}
                </Txt>
                <Txt variant="subtitle" tone="primary">
                  {new Date(date + 'T00:00:00').getDate()}
                </Txt>
              </View>
              <Txt variant="label" tone="muted">
                {formatDate(date)}
              </Txt>
            </View>
            <View style={{ gap: spacing.sm }}>
              {items.map((h) => (
                <Card key={h.id} onPress={() => nav.navigate('CaseDetail', { id: h.caseId })}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: spacing.sm }}>
                      <Txt variant="body" weight="600" numberOfLines={1}>
                        {h.caseTitle}
                      </Txt>
                      <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                        {h.caseReference} · {h.purpose}
                      </Txt>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <Feather name="map-pin" size={12} color={c.textFaint} />
                        <Txt variant="caption" tone="faint">
                          {h.court} · {h.judge}
                        </Txt>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Txt variant="label" tone="accent">
                        {to12h(h.time)}
                      </Txt>
                      <Badge label={label(h.status)} tone="info" />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}
