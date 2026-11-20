import { useState } from 'react';
import { View } from 'react-native';

import { Alert, Avatar, Button, Input, Screen, Txt } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';

export function EditProfileScreen() {
  const { spacing } = useTheme();
  const { user } = useAuth();
  const nav = useAppNavigation();
  const [saved, setSaved] = useState(false);
  const isClient = user?.role === 'client';

  const save = () => {
    setSaved(true);
    setTimeout(() => nav.goBack(), 900);
  };

  return (
    <Screen>
      <Txt variant="title">Edit profile</Txt>
      <View style={{ alignItems: 'center', marginVertical: spacing.xl }}>
        <Avatar name={user?.name ?? 'User'} size={88} />
        <Button title="Change photo" variant="ghost" size="sm" icon="camera" style={{ marginTop: spacing.sm }} />
      </View>

      {saved ? <Alert tone="success" message="Your profile has been updated." /> : null}

      <View style={{ gap: spacing.lg, marginTop: saved ? spacing.lg : 0 }}>
        <Input label="Full name" icon="user" defaultValue={user?.name} />
        <Input label="Email" icon="mail" defaultValue={user?.email} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Phone" icon="phone" defaultValue="+92 300 1234567" keyboardType="phone-pad" />
        <Input label="City" icon="map-pin" defaultValue="Lahore" />
        {!isClient ? <Input label="Chamber / office address" icon="briefcase" defaultValue="12-Main Boulevard, Gulberg, Lahore" /> : null}
        {!isClient ? <Input label="About" icon="file-text" defaultValue="Advocate of the High Court." multiline /> : null}
        <Button title="Save changes" icon="check" onPress={save} full />
      </View>
    </Screen>
  );
}
