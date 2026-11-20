import { type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  edges?: Edge[];
  background?: 'bg' | 'surface';
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: ViewStyle;
  footer?: ReactNode;
};

/** Safe-area screen wrapper with the themed background and optional pull-to-refresh scroll. */
export function Screen({ children, scroll = true, padded = true, edges = ['top'], background = 'bg', refreshing, onRefresh, contentStyle, footer }: Props) {
  const { c, spacing } = useTheme();
  const bg = background === 'bg' ? c.bg : c.surface;
  const pad = padded ? { padding: spacing.lg } : null;

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: bg }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[pad, { paddingBottom: spacing['4xl'] }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.textMuted} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, contentStyle]}>{children}</View>
      )}
      {footer ? <View style={{ padding: spacing.lg, backgroundColor: bg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
