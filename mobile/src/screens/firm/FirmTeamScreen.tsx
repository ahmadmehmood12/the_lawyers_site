import { View } from 'react-native';

import { Avatar, Badge, Button, Card, ListRow, Screen, Txt } from '@/components';
import { team } from '@/data/mock';
import { titleCase } from '@/lib/format';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function FirmTeamScreen() {
  const { spacing } = useTheme();
  const nav = useAppNavigation();

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Txt variant="title">Team</Txt>
        <Button title="Invite" size="sm" icon="user-plus" />
      </View>

      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        {team.map((m, i) => (
          <ListRow
            key={m.id}
            leading={<Avatar name={m.name} tone="neutral" />}
            title={m.name}
            subtitle={`${m.designation} · ${titleCase(m.role)}`}
            trailing={
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                {m.status === 'invited' ? <Badge label="Invited" tone="warning" /> : <Badge label={`${m.activeCases} cases`} tone="info" />}
              </View>
            }
            divider={i < team.length - 1}
            chevron
            onPress={() => nav.navigate('TeamMemberDetail', { id: m.id })}
          />
        ))}
      </Card>
    </Screen>
  );
}
