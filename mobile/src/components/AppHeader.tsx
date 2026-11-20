import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Avatar } from './Avatar';
import { IconButton } from './Misc';
import { Txt } from './Txt';

type Props = {
  greeting?: string;
  name: string;
  subtitle?: string;
  avatarUri?: string | null;
  onNotifications?: () => void;
  onProfile?: () => void;
  unread?: boolean;
};

/** The dashboard header: greeting, person, a notifications bell and the profile avatar. */
export function AppHeader({ greeting, name, subtitle, avatarUri, onNotifications, onProfile, unread }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
      <View style={{ flex: 1 }}>
        {greeting ? (
          <Txt variant="caption" tone="muted">
            {greeting}
          </Txt>
        ) : null}
        <Txt variant="heading" numberOfLines={1}>
          {name}
        </Txt>
        {subtitle ? (
          <Txt variant="caption" tone="faint" style={{ marginTop: 2 }}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton icon="bell" onPress={onNotifications} badge={unread} />
        <Avatar name={name} uri={avatarUri} size={40} />
      </View>
    </View>
  );
}
