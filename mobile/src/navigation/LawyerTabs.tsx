import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/context/AuthContext';
import { MessagesScreen } from '@/screens/account/MessagesScreens';
import { MoreScreen } from '@/screens/account/MoreScreen';
import { CourtDiaryScreen } from '@/screens/workspace/CourtDiaryScreen';
import { WorkspaceCasesScreen } from '@/screens/workspace/WorkspaceCasesScreen';
import { WorkspaceHomeScreen } from '@/screens/workspace/WorkspaceHomeScreen';
import { useAppNavigation } from '@/navigation/types';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { LawyerTabsParamList } from './types';

const Tab = createBottomTabNavigator<LawyerTabsParamList>();

/** Advocates and law firms: Home, Cases, Diary, Messages, More (all other modules). */
export function LawyerTabs() {
  const { c } = useTheme();
  const { user } = useAuth();
  const stack = useAppNavigation();
  const more = (user?.unread.appointments ?? 0) + (user?.unread.notifications ?? 0);

  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="LawyerHome" options={{ title: 'Home', tabBarIcon: tabIcon('grid') }}>
        {({ navigation }) => <WorkspaceHomeScreen onOpenTab={(t) => (t === 'appointments' ? stack.navigate('Appointments') : navigation.navigate(t === 'cases' ? 'LawyerCases' : 'LawyerCalendar'))} />}
      </Tab.Screen>
      <Tab.Screen name="LawyerCases" component={WorkspaceCasesScreen} options={{ title: 'Cases', tabBarIcon: tabIcon('briefcase') }} />
      <Tab.Screen name="LawyerCalendar" component={CourtDiaryScreen} options={{ title: 'Diary', tabBarIcon: tabIcon('book') }} />
      <Tab.Screen name="LawyerMessages" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: tabIcon('message-circle'), tabBarBadge: user?.unread.messages || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }} />
      <Tab.Screen name="LawyerMore" component={MoreScreen} options={{ title: 'More', tabBarIcon: tabIcon('menu'), tabBarBadge: more || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }} />
    </Tab.Navigator>
  );
}
