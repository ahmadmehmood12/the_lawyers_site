import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

/** Status pill, with the same tone vocabulary as the web app's StatusBadge. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { c, radius, spacing } = useTheme();
  const map = {
    neutral: { bg: c.surfaceAlt, fg: c.textMuted },
    success: { bg: c.successSoft, fg: c.success },
    warning: { bg: c.warningSoft, fg: c.warning },
    danger: { bg: c.dangerSoft, fg: c.danger },
    info: { bg: c.primarySoft, fg: c.primary },
    accent: { bg: c.accentSoft, fg: c.accentText },
  }[tone];

  return (
    <View style={[styles.badge, { backgroundColor: map.bg, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3 }]}>
      <Txt variant="caption" weight="700" style={{ color: map.fg }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ badge: { alignSelf: 'flex-start' } });
