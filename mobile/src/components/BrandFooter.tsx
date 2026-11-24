import { Feather, FontAwesome } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Linking, Pressable, View } from 'react-native';

import { useBrand } from '@/context/AppConfigContext';
import { useTheme } from '@/theme';
import { Txt } from './Txt';

const ICONS: Record<string, keyof typeof FontAwesome.glyphMap> = { facebook: 'facebook', instagram: 'instagram', youtube: 'youtube-play', linkedin: 'linkedin', x: 'twitter', whatsapp: 'whatsapp' };

/** Social links, contact details and version — all from Admin > Settings, like the website footer. */
export function BrandFooter() {
  const { c, spacing } = useTheme();
  const { name, config } = useBrand();
  const social = Object.entries(config?.social ?? {}).filter(([, url]) => !!url);
  const contact = config?.contact;

  return (
    <View style={{ alignItems: 'center', gap: spacing.md, marginTop: spacing['2xl'], paddingBottom: spacing.lg }}>
      {social.length ? (
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          {social.map(([key, url]) => (
            <Pressable key={key} onPress={() => void Linking.openURL(key === 'whatsapp' && !/^https?:/.test(url!) ? `https://wa.me/${url!.replace(/\D/g, '')}` : url!)} hitSlop={6} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.border }} accessibilityLabel={key}>
              <FontAwesome name={ICONS[key] ?? 'link'} size={17} color={c.primary} />
            </Pressable>
          ))}
        </View>
      ) : null}
      {contact?.phone || contact?.email ? (
        <View style={{ flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap', justifyContent: 'center' }}>
          {contact.phone ? <Pressable onPress={() => void Linking.openURL(`tel:${contact.phone}`)}><Txt variant="caption" tone="muted"><Feather name="phone" size={11} /> {contact.phone}</Txt></Pressable> : null}
          {contact.email ? <Pressable onPress={() => void Linking.openURL(`mailto:${contact.email}`)}><Txt variant="caption" tone="muted"><Feather name="mail" size={11} /> {contact.email}</Txt></Pressable> : null}
        </View>
      ) : null}
      {contact?.address ? <Txt variant="caption" tone="faint" center>{contact.address}</Txt> : null}
      <Txt variant="caption" tone="faint">{name} · v{Constants.expoConfig?.version ?? '1.0.0'}</Txt>
    </View>
  );
}
