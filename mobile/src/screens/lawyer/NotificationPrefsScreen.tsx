import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';

import { Card, Screen, SectionHeader, Txt } from '@/components';
import { useTheme } from '@/theme';

type Channel = 'push' | 'email' | 'whatsapp';
const EVENTS = ['Hearing reminders', 'New appointment requests', 'Appointment changes', 'Payments received', 'Documents shared', 'New messages'];

export function NotificationPrefsScreen() {
  const { c, spacing } = useTheme();
  const [prefs, setPrefs] = useState<Record<string, Record<Channel, boolean>>>(() =>
    Object.fromEntries(EVENTS.map((e) => [e, { push: true, email: e.includes('Payment') || e.includes('Hearing'), whatsapp: e.includes('Hearing') }])),
  );

  const toggle = (event: string, channel: Channel) =>
    setPrefs((p) => ({ ...p, [event]: { ...p[event], [channel]: !p[event][channel] } }));

  const CHANNELS: { key: Channel; icon: keyof typeof Feather.glyphMap; label: string }[] = [
    { key: 'push', icon: 'smartphone', label: 'Push' },
    { key: 'email', icon: 'mail', label: 'Email' },
    { key: 'whatsapp', icon: 'message-circle', label: 'WhatsApp' },
  ];

  return (
    <Screen>
      <Txt variant="title">Notification preferences</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
        Choose how you’re alerted for each kind of update.
      </Txt>

      <SectionHeader title="By event" />
      {EVENTS.map((event) => (
        <Card key={event} style={{ marginBottom: spacing.md }}>
          <Txt variant="body" weight="600" style={{ marginBottom: spacing.md }}>
            {event}
          </Txt>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {CHANNELS.map((ch) => (
              <View key={ch.key} style={styles.channel}>
                <Feather name={ch.icon} size={16} color={prefs[event][ch.key] ? c.accent : c.textFaint} />
                <Txt variant="caption" tone="muted" style={{ marginVertical: 4 }}>
                  {ch.label}
                </Txt>
                <Switch value={prefs[event][ch.key]} onValueChange={() => toggle(event, ch.key)} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />
              </View>
            ))}
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({ channel: { alignItems: 'center', flex: 1 } });
