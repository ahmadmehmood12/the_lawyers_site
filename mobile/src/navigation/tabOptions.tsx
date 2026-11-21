import { Feather } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import { fontFamily, type ThemeColors } from '@/theme';

/** Shared bottom-tab styling so all three role tab bars look identical. */
export function tabScreenOptions(c: ThemeColors): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarActiveTintColor: c.primary,
    tabBarInactiveTintColor: c.textFaint,
    tabBarStyle: {
      backgroundColor: c.surface,
      borderTopColor: c.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      height: 64,
      paddingTop: 6,
      paddingBottom: 10,
    },
    tabBarLabelStyle: { fontSize: 11, fontFamily: fontFamily.semibold },
  };
}

export function tabIcon(name: keyof typeof Feather.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Feather name={name} size={size - 2} color={color} />;
}
