import { Feather } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Txt } from '@/components';
import { completeOnboarding } from '@/lib/storage';
import { useTheme } from '@/theme';

type Slide = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
};

const slides: Slide[] = [
  {
    icon: 'search',
    title: 'Find verified lawyers',
    body: 'Search advocates and law firms by practice area, location, court and consultation preferences.',
  },
  {
    icon: 'briefcase',
    title: 'Keep every case in order',
    body: 'Follow case progress, court hearings and diary entries from one place.',
  },
  {
    icon: 'calendar',
    title: 'Book consultations',
    body: 'Request an appointment, choose a consultation mode and manage confirmations.',
  },
  {
    icon: 'book-open',
    title: 'Research with confidence',
    body: 'Browse reported judgments and use the AI legal assistant where your plan allows it.',
  },
];

export function OnboardingScreen({ onFinish }: { onFinish: () => void }) {
  const { c, spacing, radius } = useTheme();
  const [index, setIndex] = useState(0);
  const finishing = useRef(false);
  const slide = slides[index];
  const last = index === slides.length - 1;

  const finish = async () => {
    if (finishing.current) {
      return;
    }
    finishing.current = true;
    await completeOnboarding();
    onFinish();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Skip onboarding" onPress={() => void finish()}>
          <Txt variant="label" tone="muted">Skip</Txt>
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={[styles.art, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
          <View style={[styles.artInner, { backgroundColor: c.accentSoft, borderRadius: radius.md }]}>
            <Feather name={slide.icon} size={42} color={c.accentText} />
          </View>
          <View style={[styles.rule, { backgroundColor: c.border }]} />
          <View style={styles.lines}>
            <View style={[styles.line, { backgroundColor: c.borderStrong, width: '72%' }]} />
            <View style={[styles.line, { backgroundColor: c.border, width: '54%' }]} />
          </View>
        </View>
        <Txt variant="title" style={{ marginTop: spacing['2xl'] }}>
          {slide.title}
        </Txt>
        <Txt variant="body" tone="muted" center style={{ marginTop: spacing.md, maxWidth: 360 }}>
          {slide.body}
        </Txt>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((item, position) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`Go to step ${position + 1}`}
              onPress={() => setIndex(position)}
              style={[styles.dot, { backgroundColor: position === index ? c.accent : c.borderStrong, width: position === index ? 20 : 6 }]}
            />
          ))}
        </View>
        <Button
          title={last ? 'Get started' : 'Next'}
          variant={last ? 'accent' : 'primary'}
          iconRight={last ? 'arrow-right' : undefined}
          onPress={() => (last ? void finish() : setIndex((value) => value + 1))}
          full
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: 'flex-end', paddingHorizontal: 20, paddingVertical: 12 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  art: { width: '100%', maxWidth: 320, aspectRatio: 1.25, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  artInner: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, width: '100%', marginVertical: 24 },
  lines: { gap: 10, alignItems: 'center', width: '100%' },
  line: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 28, gap: 20 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
});
