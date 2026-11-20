import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme';
import { Txt } from './Txt';

type Props = {
  name: string;
  uri?: string | null;
  size?: number;
  tone?: 'primary' | 'accent' | 'neutral';
};

function initials(name: string): string {
  const parts = name.replace(/^(Hon'?ble|Mr\.?|Mrs\.?|Ms\.?|Justice|Chief|Dr\.?|Syed)\s+/gi, '').trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || name.slice(0, 2).toUpperCase();
}

/** Rounded avatar: a photo when present, otherwise the person's initials. */
export function Avatar({ name, uri, size = 44, tone = 'primary' }: Props) {
  const { c } = useTheme();
  const bg = tone === 'accent' ? c.accentSoft : tone === 'neutral' ? c.surfaceAlt : c.primarySoft;
  const fg = tone === 'accent' ? c.accentText : tone === 'neutral' ? c.textMuted : c.primary;

  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.surfaceAlt }} />;
  }

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }]}>
      <Txt weight="700" style={{ color: fg, fontSize: size * 0.38 }}>
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({ base: { alignItems: 'center', justifyContent: 'center' } });
