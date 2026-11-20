import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Alert, Button, Card, Divider, Screen, SectionHeader, Txt } from '@/components';
import { useTheme } from '@/theme';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function AvailabilityScreen() {
  const { c, spacing } = useTheme();
  const [open, setOpen] = useState<Record<string, boolean>>({ Monday: true, Tuesday: true, Wednesday: true, Thursday: true, Friday: true, Saturday: true, Sunday: false });
  const [online, setOnline] = useState(true);
  const [inPerson, setInPerson] = useState(true);
  const [saved, setSaved] = useState(false);

  return (
    <Screen footer={<Button title="Save availability" icon="check" onPress={() => setSaved(true)} full />}>
      <Txt variant="title">Availability</Txt>
      <Txt variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
        Clients can only request appointments during your working hours.
      </Txt>

      {saved ? (
        <View style={{ marginTop: spacing.lg }}>
          <Alert tone="success" message="Your availability has been updated." />
        </View>
      ) : null}

      <SectionHeader title="Consultation types" />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
          <Txt variant="body" style={{ flex: 1 }}>
            Online (video) consultations
          </Txt>
          <Switch value={online} onValueChange={setOnline} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
          <Txt variant="body" style={{ flex: 1 }}>
            In-person (at chambers)
          </Txt>
          <Switch value={inPerson} onValueChange={setInPerson} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />
        </View>
      </Card>

      <SectionHeader title="Working hours" />
      <Card>
        {DAYS.map((day, i) => (
          <View key={day}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Txt variant="body" weight={open[day] ? '600' : '400'} style={{ color: open[day] ? c.text : c.textFaint }}>
                  {day}
                </Txt>
                <Txt variant="caption" tone="faint">
                  {open[day] ? '10:00 AM – 6:00 PM' : 'Closed'}
                </Txt>
              </View>
              <Switch value={open[day]} onValueChange={(v) => setOpen((o) => ({ ...o, [day]: v }))} trackColor={{ true: c.accent, false: c.borderStrong }} thumbColor="#fff" />
            </View>
            {i < DAYS.length - 1 ? <Divider /> : null}
          </View>
        ))}
      </Card>
    </Screen>
  );
}
