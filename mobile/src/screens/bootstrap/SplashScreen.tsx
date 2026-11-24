import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Linking, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppConfig } from '@/api';
import { Button, Txt } from '@/components';
import { forest, white } from '@/theme';

type Props = {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onFinish: () => void;
};

/**
 * Branded launch screen: continues from the native splash (same #0f2c1e and mark), animates the
 * logo in, checks /api/app/config, then moves on by itself unless maintenance / update / offline.
 */
export function SplashScreen({ config, loading, error, onRetry, onFinish }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.timing(progress, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true })).start();
  }, [fade, rise, progress]);

  const blocked = !!config?.maintenance || !!config?.force_update;
  useEffect(() => {
    if (!loading && config && !blocked) {
      const timer = setTimeout(onFinish, 900);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [loading, config, blocked, onFinish]);

  const storeUrl = config?.android.url ?? config?.ios.url ?? null;
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-60, 120] });

  return (
    <LinearGradient colors={[forest[800], forest[900], forest[950]]} style={styles.fill}>
      <SafeAreaView style={styles.container}>
        <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: rise }] }]}>
          <View style={styles.mark}>
            <Image source={config?.icon_url || config?.site.logo_url ? { uri: (config.icon_url || config.site.logo_url)! } : require('../../../assets/splash-icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Txt variant="display" center style={styles.name}>{config?.app_name || config?.site.name || 'Wakeel Diary'}</Txt>
          <Txt variant="label" center style={styles.tagline}>{(config?.site.tagline || 'Your legal practice · in your pocket').toUpperCase()}</Txt>
        </Animated.View>

        <View style={styles.footer}>
          {loading ? (
            <View style={styles.track}>
              <Animated.View style={[styles.bar, { transform: [{ translateX }] }]} />
            </View>
          ) : null}
          {error ? (
            <>
              <Txt variant="caption" center style={styles.muted}>{error}</Txt>
              <View style={styles.row}>
                <Button title="Retry" variant="inverse" size="sm" onPress={onRetry} />
                <Button title="Continue" variant="ghost" size="sm" onPress={onFinish} />
              </View>
            </>
          ) : null}
          {config?.maintenance ? (
            <>
              <Txt variant="subtitle" center style={styles.white}>Maintenance in progress</Txt>
              <Txt variant="caption" center style={styles.muted}>{config.maintenance_message ?? 'The service is temporarily unavailable.'}</Txt>
              <Button title="Try again" variant="inverse" size="sm" onPress={onRetry} style={styles.center} />
            </>
          ) : null}
          {config?.force_update ? (
            <>
              <Txt variant="subtitle" center style={styles.white}>Update required</Txt>
              <Txt variant="caption" center style={styles.muted}>Please update the app to continue.</Txt>
              {storeUrl ? <Button title="Open store" variant="inverse" size="sm" onPress={() => void Linking.openURL(storeUrl)} style={styles.center} /> : null}
            </>
          ) : null}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, justifyContent: 'space-between' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  mark: { width: 112, height: 112, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  logo: { width: 76, height: 76 },
  name: { marginTop: 26, color: white },
  tagline: { marginTop: 8, color: forest[200], letterSpacing: 2, fontSize: 11 },
  footer: { paddingHorizontal: 32, paddingBottom: 44, gap: 10, minHeight: 90, justifyContent: 'flex-end' },
  track: { alignSelf: 'center', width: 120, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  bar: { width: 60, height: 3, borderRadius: 2, backgroundColor: white },
  white: { color: white },
  muted: { color: forest[200] },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  center: { alignSelf: 'center' },
});
