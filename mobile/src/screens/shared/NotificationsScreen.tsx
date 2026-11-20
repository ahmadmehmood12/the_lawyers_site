import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, Screen, Txt } from '@/components';
import { notifications as seed } from '@/data/mock';
import type { AppNotification } from '@/data/types';
import { useTheme } from '@/theme';

const ICONS: Record<AppNotification['kind'], keyof typeof Feather.glyphMap> = {
  hearing: 'calendar',
  appointment: 'clock',
  payment: 'credit-card',
  document: 'file-text',
  message: 'message-circle',
  system: 'bell',
};

export function NotificationsScreen() {
  const { c, spacing, radius } = useTheme();
  const [items, setItems] = useState(seed);
  const markAll = () => setItems((list) => list.map((n) => ({ ...n, read: true })));
  const toggle = (id: string) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n)));
  const unread = items.filter((n) => !n.read).length;

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <Txt variant="title">Notifications</Txt>
        {unread > 0 ? (
          <Pressable onPress={markAll} hitSlop={8}>
            <Txt variant="label" tone="accent">
              Mark all read
            </Txt>
          </Pressable>
        ) : null}
      </View>

      {items.length === 0 ? (
        <EmptyState icon="bell" title="You’re all caught up" message="New hearings, appointments and payments will show up here." />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => toggle(n.id)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: n.read ? c.surface : c.primarySoft,
                  borderColor: c.border,
                  borderRadius: radius.lg,
                  padding: spacing.md,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name={ICONS[n.kind]} size={18} color={c.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Txt variant="body" weight="600">
                    {n.title}
                  </Txt>
                  <Txt variant="caption" tone="faint">
                    {n.time}
                  </Txt>
                </View>
                <Txt variant="caption" tone="muted" style={{ marginTop: 2 }}>
                  {n.body}
                </Txt>
              </View>
              {!n.read ? <View style={[styles.dot, { backgroundColor: c.accent }]} /> : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6, marginTop: 6 },
});
