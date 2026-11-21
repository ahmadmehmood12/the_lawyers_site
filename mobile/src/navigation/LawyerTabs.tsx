import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/context/AuthContext';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { CourtDiaryScreen } from '@/screens/workspace/CourtDiaryScreen';
import { TeamScreen } from '@/screens/workspace/TeamScreen';
import { WorkspaceAppointmentsScreen } from '@/screens/workspace/WorkspaceAppointmentsScreen';
import { WorkspaceCasesScreen } from '@/screens/workspace/WorkspaceCasesScreen';
import { WorkspaceHomeScreen } from '@/screens/workspace/WorkspaceHomeScreen';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { LawyerTabsParamList } from './types';

const Tab = createBottomTabNavigator<LawyerTabsParamList>();

/** Advocates and law firms share the workspace; a firm gets a Team tab instead of the diary tab. */
export function LawyerTabs() {
  const { c } = useTheme();
  const { user } = useAuth();
  const firm = user?.organization?.type === 'firm';
  const badge = user?.unread.appointments ? user.unread.appointments : undefined;

  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="LawyerHome" options={{ title: 'Home', tabBarIcon: tabIcon('grid') }}>
        {({ navigation }) => <WorkspaceHomeScreen onOpenTab={(t) => navigation.navigate(t === 'cases' ? 'LawyerCases' : t === 'diary' ? 'LawyerCalendar' : 'LawyerAppointments')} />}
      </Tab.Screen>
      <Tab.Screen name="LawyerCases" component={WorkspaceCasesScreen} options={{ title: 'Cases', tabBarIcon: tabIcon('briefcase') }} />
      {firm
        ? <Tab.Screen name="LawyerCalendar" component={TeamScreen} options={{ title: 'Team', tabBarIcon: tabIcon('users') }} />
        : <Tab.Screen name="LawyerCalendar" component={CourtDiaryScreen} options={{ title: 'Diary', tabBarIcon: tabIcon('book') }} />}
      <Tab.Screen name="LawyerAppointments" component={WorkspaceAppointmentsScreen} options={{ title: 'Appointments', tabBarIcon: tabIcon('calendar'), tabBarBadge: badge, tabBarBadgeStyle: { backgroundColor: c.danger } }} />
      <Tab.Screen name="LawyerMore" component={AccountScreen} options={{ title: 'More', tabBarIcon: tabIcon('menu') }} />
    </Tab.Navigator>
  );
}
