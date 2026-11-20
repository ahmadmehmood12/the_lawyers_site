import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, marginTop: spacing.xl }}>
      <Txt variant="subtitle">{title}</Txt>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Txt variant="label" tone="accent">
            {actionLabel}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}
