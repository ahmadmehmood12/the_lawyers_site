import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Alert, Avatar, Badge, Button, Card, Screen, SectionHeader, Txt } from '@/components';
import { cases, team } from '@/data/mock';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function AssignCaseScreen() {
  const { c, spacing, radius } = useTheme();
  const nav = useAppNavigation();
  const lawyers = team.filter((m) => m.role === 'lawyer' || m.role === 'associate');
  const [caseId, setCaseId] = useState<string | null>(null);
  const [lawyerId, setLawyerId] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    const cs = cases.find((x) => x.id === caseId);
    const lw = team.find((x) => x.id === lawyerId);
    return (
      <Screen>
        <Alert tone="success" title="Case assigned" message={`${cs?.reference} has been assigned to ${lw?.name}. They’ll be notified immediately.`} />
        <Button title="Done" icon="check" onPress={() => nav.goBack()} full style={{ marginTop: spacing.xl }} />
      </Screen>
    );
  }

  return (
    <Screen footer={<Button title="Assign case" icon="user-check" disabled={!caseId || !lawyerId} onPress={() => setDone(true)} full />}>
      <Txt variant="title">Assign a case</Txt>

      <SectionHeader title="1. Choose a case" />
      <View style={{ gap: spacing.sm }}>
        {cases.map((cs) => {
          const active = cs.id === caseId;
          return (
            <Pressable key={cs.id} onPress={() => setCaseId(cs.id)}>
              <Card style={{ borderColor: active ? c.accent : c.border, borderWidth: active ? 1.5 : undefined }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Txt variant="body" weight="600" numberOfLines={1}>
                      {cs.title}
                    </Txt>
                    <Txt variant="caption" tone="muted">
                      {cs.reference} · {cs.court}
                    </Txt>
                  </View>
                  <Badge label={label(cs.status)} tone={caseTone(cs.status)} />
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="2. Assign to" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {lawyers.map((lw) => {
          const active = lw.id === lawyerId;
          return (
            <Pressable
              key={lw.id}
              onPress={() => setLawyerId(lw.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, paddingRight: spacing.md, borderRadius: radius.pill, backgroundColor: active ? c.primary : c.surface, borderWidth: 1, borderColor: active ? c.primary : c.border }}
            >
              <Avatar name={lw.name} size={26} tone="neutral" />
              <Txt variant="caption" weight="600" style={{ color: active ? c.primaryText : c.text }}>
                {lw.name}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
