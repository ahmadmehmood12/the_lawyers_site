import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Badge, Card, Divider, Screen, SectionHeader, Txt } from '@/components';
import { useTheme } from '@/theme';

const ROLES = [
  { name: 'Partner', members: 1, tone: 'accent' as const },
  { name: 'Senior Associate', members: 1, tone: 'info' as const },
  { name: 'Associate', members: 1, tone: 'info' as const },
  { name: 'Paralegal', members: 1, tone: 'neutral' as const },
  { name: 'Office staff', members: 1, tone: 'neutral' as const },
];

const PERMISSIONS = ['View all cases', 'Create & edit cases', 'Manage clients', 'View finances', 'Issue invoices', 'Manage team', 'Firm settings'];

export function RolesPermissionsScreen() {
  const { c, spacing } = useTheme();
  const [role, setRole] = useState('Associate');
  const [perms, setPerms] = useState<Record<string, boolean>>({
    'View all cases': true,
    'Create & edit cases': true,
    'Manage clients': true,
    'View finances': false,
    'Issue invoices': false,
    'Manage team': false,
    'Firm settings': false,
  });

  return (
    <Screen>
      <Txt variant="title">Roles & permissions</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
        Control what each role in your firm can see and do.
      </Txt>

      <SectionHeader title="Roles" />
      <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
        {ROLES.map((r, i) => {
          const active = r.name === role;
          return (
            <View key={r.name}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
                <View style={{ flex: 1 }}>
                  <Txt variant="body" weight={active ? '700' : '500'} style={{ color: active ? c.primary : c.text }} onPress={() => setRole(r.name)}>
                    {r.name}
                  </Txt>
                  <Txt variant="caption" tone="faint">
                    {r.members} member{r.members === 1 ? '' : 's'}
                  </Txt>
                </View>
                <Badge label={active ? 'Editing' : 'Edit'} tone={active ? 'accent' : 'neutral'} />
              </View>
              {i < ROLES.length - 1 ? <Divider /> : null}
            </View>
          );
        })}
      </Card>

      <SectionHeader title={`Permissions — ${role}`} />
      <Card>
        {PERMISSIONS.map((p, i) => (
          <View key={p}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
              <Txt variant="body" style={{ flex: 1 }}>
                {p}
              </Txt>
              <Switch value={perms[p]} onValueChange={(v) => setPerms((o) => ({ ...o, [p]: v }))} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />
            </View>
            {i < PERMISSIONS.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
