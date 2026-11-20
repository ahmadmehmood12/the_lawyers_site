import { View } from 'react-native';

import { Badge, Card, EmptyState, ProgressBar, Screen, Txt } from '@/components';
import { cases, currentClientId } from '@/data/mock';
import { formatDate, relativeDay } from '@/lib/format';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function ClientCasesScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const mine = cases.filter((cs) => cs.clientId === currentClientId);

  return (
    <Screen>
      <Txt variant="title" style={{ marginBottom: spacing.lg }}>
        My cases
      </Txt>
      {mine.length === 0 ? (
        <EmptyState icon="folder" title="No cases yet" message="When a lawyer adds you to a case, it will appear here with its progress and hearing dates." />
      ) : (
        <View style={{ gap: spacing.md }}>
          {mine.map((cs) => (
            <Card key={cs.id} onPress={() => nav.navigate('CaseDetail', { id: cs.id })}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Txt variant="caption" tone="faint">
                  {cs.reference}
                </Txt>
                <Badge label={label(cs.status)} tone={caseTone(cs.status)} />
              </View>
              <Txt variant="subtitle" style={{ marginTop: 4 }} numberOfLines={2}>
                {cs.title}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                {cs.court} · {cs.type}
              </Txt>
              <View style={{ marginTop: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Txt variant="caption" tone="muted">
                  {cs.stage}
                </Txt>
                <Txt variant="caption" weight="600">
                  {cs.progress}%
                </Txt>
              </View>
              <ProgressBar value={cs.progress} tone={cs.status === 'won' ? 'success' : 'accent'} />
              {cs.nextHearing ? (
                <Txt variant="caption" tone="accent" weight="600" style={{ marginTop: spacing.md }}>
                  Next hearing {relativeDay(cs.nextHearing)} · {formatDate(cs.nextHearing)}
                </Txt>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
