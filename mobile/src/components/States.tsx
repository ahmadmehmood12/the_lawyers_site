import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Txt } from './Txt';

/** Empty state: a quiet icon, a line of explanation, an optional action. */
export function EmptyState({ icon = 'inbox', title, message, actionLabel, onAction }: { icon?: keyof typeof Feather.glyphMap; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  const { c, spacing } = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: spacing['4xl'] }]}>
      <View style={[styles.circle, { backgroundColor: c.surfaceAlt }]}>
        <Feather name={icon} size={24} color={c.textFaint} />
      </View>
      <Txt variant="subtitle" center style={{ marginTop: spacing.lg }}>
        {title}
      </Txt>
      {message ? (
        <Txt variant="body" tone="muted" center style={{ marginTop: spacing.xs, maxWidth: 280 }}>
          {message}
        </Txt>
      ) : null}
      {actionLabel ? <Button title={actionLabel} variant="secondary" size="sm" onPress={onAction} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

/** Error state with a retry. */
export function ErrorState({ message = 'Something went wrong.', onRetry }: { message?: string; onRetry?: () => void }) {
  const { c, spacing } = useTheme();
  return (
    <View style={[styles.center, { paddingVertical: spacing['4xl'] }]}>
      <View style={[styles.circle, { backgroundColor: c.dangerSoft }]}>
        <Feather name="alert-triangle" size={24} color={c.danger} />
      </View>
      <Txt variant="subtitle" center style={{ marginTop: spacing.lg }}>
        We hit a snag
      </Txt>
      <Txt variant="body" tone="muted" center style={{ marginTop: spacing.xs, maxWidth: 280 }}>
        {message}
      </Txt>
      {onRetry ? <Button title="Try again" variant="secondary" size="sm" icon="refresh-cw" onPress={onRetry} style={{ marginTop: spacing.lg }} /> : null}
    </View>
  );
}

/** Full-screen loading spinner. */
export function Loading({ label }: { label?: string }) {
  const { c, spacing } = useTheme();
  return (
    <View style={[styles.center, { flex: 1, paddingVertical: spacing['4xl'] }]}>
      <ActivityIndicator color={c.accent} />
      {label ? (
        <Txt variant="caption" tone="muted" style={{ marginTop: spacing.md }}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
