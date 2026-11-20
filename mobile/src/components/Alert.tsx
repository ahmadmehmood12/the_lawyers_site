import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { amber, navy, red, useTheme, verdant } from '@/theme';
import { Txt } from './Txt';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const ICONS: Record<Tone, keyof typeof Feather.glyphMap> = {
  info: 'info',
  success: 'check-circle',
  warning: 'alert-triangle',
  danger: 'alert-octagon',
};

/** Solid inline alert, matching the web app's Alert (dark fill, white text, coloured start edge). */
export function Alert({ tone = 'info', title, message }: { tone?: Tone; title?: string; message: string }) {
  const { radius, spacing } = useTheme();
  const fill = { info: navy[900], success: verdant[800], warning: amber[900], danger: red[800] }[tone];
  const edge = { info: '#cfa33b', success: verdant[400], warning: amber[400], danger: red[400] }[tone];

  return (
    <View style={{ flexDirection: 'row', backgroundColor: fill, borderRadius: radius.md, overflow: 'hidden' }}>
      <View style={{ width: 4, backgroundColor: edge }} />
      <View style={{ flexDirection: 'row', flex: 1, padding: spacing.md, gap: spacing.md }}>
        <Feather name={ICONS[tone]} size={18} color="#ffffff" style={{ marginTop: 1 }} />
        <View style={{ flex: 1 }}>
          {title ? (
            <Txt variant="label" style={{ color: '#ffffff', marginBottom: 2 }}>
              {title}
            </Txt>
          ) : null}
          <Txt variant="caption" style={{ color: '#ffffff', lineHeight: 18 }}>
            {message}
          </Txt>
        </View>
      </View>
    </View>
  );
}
