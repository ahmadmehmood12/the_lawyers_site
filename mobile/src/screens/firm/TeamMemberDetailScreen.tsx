import { type RouteProp, useRoute } from '@react-navigation/native';
import { View } from 'react-native';

import { Avatar, Badge, Button, Card, EmptyState, KeyValue, ListRow, Screen, SectionHeader, Stat, Txt } from '@/components';
import { cases, team } from '@/data/mock';
import { titleCase } from '@/lib/format';
import { caseTone, label } from '@/lib/status';
import { useAppNavigation, type RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/theme';

export function TeamMemberDetailScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, 'TeamMemberDetail'>>();
  const member = team.find((m) => m.id === params.id);

  if (!member) {
    return (
      <Screen>
        <EmptyState icon="user" title="Member not found" />
      </Screen>
    );
  }

  const memberCases = cases.filter((cs) => cs.lawyers.includes(member.name));

  return (
    <Screen>
      <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
        <Avatar name={member.name} size={76} tone="neutral" />
        <Txt variant="subtitle" style={{ marginTop: spacing.md }}>
          {member.name}
        </Txt>
        <Txt variant="caption" tone="muted">
          {member.designation}
        </Txt>
        <View style={{ marginTop: spacing.sm }}>
          <Badge label={member.status === 'invited' ? 'Invitation pending' : 'Active'} tone={member.status === 'invited' ? 'warning' : 'success'} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Stat value={member.activeCases} label="Active cases" />
        <Stat value={titleCase(member.role)} label="Role" />
      </View>

      <Card style={{ marginTop: spacing.lg }}>
        <KeyValue label="Email" value={member.email} />
        <KeyValue label="Designation" value={member.designation} last />
      </Card>

      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        <Button title="Message" variant="secondary" icon="message-circle" style={{ flex: 1 }} />
        <Button title="Assign case" icon="plus" onPress={() => nav.navigate('AssignCase')} style={{ flex: 1 }} />
      </View>

      <SectionHeader title="Assigned cases" />
      {memberCases.length === 0 ? (
        <EmptyState icon="folder" title="No cases assigned" />
      ) : (
        <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
          {memberCases.map((cs, i) => (
            <ListRow
              key={cs.id}
              title={cs.title}
              subtitle={`${cs.reference} · ${cs.court}`}
              trailing={<Badge label={label(cs.status)} tone={caseTone(cs.status)} />}
              divider={i < memberCases.length - 1}
              chevron
              onPress={() => nav.navigate('CaseDetail', { id: cs.id })}
            />
          ))}
        </Card>
      )}
    </Screen>
  );
}
