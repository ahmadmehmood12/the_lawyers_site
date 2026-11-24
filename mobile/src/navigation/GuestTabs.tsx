import { Feather } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, View } from 'react-native';

import { BrandFooter, Button, Screen, SegmentedControl, Txt } from '@/components';
import { useBrand } from '@/context/AppConfigContext';
import { ClientHomeScreen } from '@/screens/client/ClientHomeScreen';
import { FindLawyersScreen } from '@/screens/client/FindLawyersScreen';
import { ArticlesScreen } from '@/screens/shared/ArticleScreens';
import { JudgmentsScreen } from '@/screens/shared/JudgmentScreens';
import { forest, useTheme, white, type ThemeMode } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import { useAppNavigation, type GuestTabsParamList } from './types';

const Tab = createBottomTabNavigator<GuestTabsParamList>();

/** Signed-out visitors: browse lawyers, firms, articles and judgments; sign in only to book. */
export function GuestTabs() {
  const { c } = useTheme();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="FindLawyers" component={FindLawyersScreen} options={{ title: 'Find', tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="GuestArticles" component={ArticlesScreen} options={{ title: 'Articles', tabBarIcon: tabIcon('book-open') }} />
      <Tab.Screen name="GuestJudgments" component={JudgmentsScreen} options={{ title: 'Judgments', tabBarIcon: tabIcon('book') }} />
      <Tab.Screen name="GuestAccount" component={GuestAccountScreen} options={{ title: 'Sign in', tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}

function GuestAccountScreen() {
  const nav = useAppNavigation();
  const { spacing, radius, mode, setMode } = useTheme();
  const brand = useBrand();
  const perks: [keyof typeof Feather.glyphMap, string][] = [['calendar', 'Book consultations with verified lawyers'], ['folder', 'Follow your cases, hearings and documents'], ['message-circle', 'Message your lawyer securely'], ['bell', 'Reminders by app, email and WhatsApp']];
  return (
    <Screen padded={false} edges={[]}>
      <LinearGradient colors={[forest[800], forest[900]]} style={{ paddingTop: 70, paddingBottom: 40, paddingHorizontal: spacing.xl, alignItems: 'center' }}>
        <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={brand.logo ? { uri: brand.logo } : require('../../assets/splash-icon.png')} style={{ width: 46, height: 46 }} resizeMode="contain" />
        </View>
        <Txt variant="title" style={{ color: white, marginTop: spacing.lg }} center>{brand.name}</Txt>
        <Txt style={{ color: forest[200], marginTop: 4 }} center>{brand.tagline || 'Your legal practice, in your pocket'}</Txt>
      </LinearGradient>
      <View style={{ padding: spacing.xl, gap: spacing.lg }}>
        {perks.map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center' }}>
            <View style={{ width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: forest[50] }}><Feather name={icon} size={18} color={forest[900]} /></View>
            <Txt style={{ flex: 1 }}>{text}</Txt>
          </View>
        ))}
        <Button title="Sign in" full size="lg" onPress={() => nav.navigate('Login')} />
        <Button title="Create an account" full size="lg" variant="secondary" onPress={() => nav.navigate('Register')} />
        <SegmentedControl<ThemeMode> value={mode} onChange={setMode} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <BrandFooter />
      </View>
    </Screen>
  );
}
