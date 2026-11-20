import { useEffect, useRef } from 'react';
import { Animated, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';
import { Card } from './Card';

/** A shimmering placeholder block, for loading states. */
export function Skeleton({ width = '100%', height = 14, radius = 6, style }: { width?: number | `${number}%` | 'auto'; height?: number; radius?: number; style?: ViewStyle }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: c.surfaceAlt, opacity: pulse }, style]} />;
}

/** A card-shaped loading placeholder used in lists. */
export function SkeletonCard() {
  const { spacing } = useTheme();
  return (
    <Card style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={44} height={44} radius={22} />
        <View style={{ flex: 1, marginLeft: spacing.md, gap: spacing.sm }}>
          <Skeleton width="60%" height={14} />
          <Skeleton width="40%" height={11} />
        </View>
      </View>
      <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
        <Skeleton width="100%" height={11} />
        <Skeleton width="80%" height={11} />
      </View>
    </Card>
  );
}
