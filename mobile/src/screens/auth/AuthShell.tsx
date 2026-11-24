import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Txt } from '@/components';
import { useBrand } from '@/context/AppConfigContext';
import { forest, useTheme, white } from '@/theme';

/** Shared layout for every auth screen: green brand header, white sheet with the form. */
export function AuthShell({ title, subtitle, children, compact }: { title: string; subtitle?: string; children: ReactNode; compact?: boolean }) {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const brand = useBrand();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: forest[900] }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
        <LinearGradient colors={[forest[800], forest[900]]} style={{ paddingTop: insets.top + (compact ? 16 : 36), paddingBottom: 44, paddingHorizontal: spacing.xl }}>
          <View style={styles.brand}>
            <View style={styles.logoWrap}>
              <Image source={brand.logo ? { uri: brand.logo } : require('../../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Txt variant="label" style={{ color: forest[100], letterSpacing: 1.5 }}>{brand.name.toUpperCase()}</Txt>
          </View>
          <Txt variant="display" style={{ color: white, marginTop: compact ? 18 : 28 }}>{title}</Txt>
          {subtitle ? <Txt style={{ color: forest[200], marginTop: 6 }}>{subtitle}</Txt> : null}
        </LinearGradient>
        <View style={{ flex: 1, marginTop: -24, backgroundColor: c.bg, borderTopLeftRadius: radius.xl + 8, borderTopRightRadius: radius.xl + 8, padding: spacing.xl, paddingBottom: insets.bottom + spacing.xl, gap: spacing.lg }}>
          {children}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 24, height: 24 },
});
