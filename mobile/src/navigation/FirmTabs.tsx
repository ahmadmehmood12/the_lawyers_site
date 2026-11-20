import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { FirmAppointmentsScreen } from '@/screens/firm/FirmAppointmentsScreen';
import { FirmCasesScreen } from '@/screens/firm/FirmCasesScreen';
import { FirmDashboardScreen } from '@/screens/firm/FirmDashboardScreen';
import { FirmMoreScreen } from '@/screens/firm/FirmMoreScreen';
import { FirmTeamScreen } from '@/screens/firm/FirmTeamScreen';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { FirmTabsParamList } from './types';

const Tab = createBottomTabNavigator<FirmTabsParamList>();

export function FirmTabs() {
  const { c } = useTheme();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="FirmHome" component={FirmDashboardScreen} options={{ title: 'Overview', tabBarIcon: tabIcon('bar-chart-2') }} />
      <Tab.Screen name="FirmCases" component={FirmCasesScreen} options={{ title: 'Cases', tabBarIcon: tabIcon('folder') }} />
      <Tab.Screen name="FirmTeam" component={FirmTeamScreen} options={{ title: 'Team', tabBarIcon: tabIcon('users') }} />
      <Tab.Screen name="FirmAppointments" component={FirmAppointmentsScreen} options={{ title: 'Appointments', tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="FirmMore" component={FirmMoreScreen} options={{ title: 'More', tabBarIcon: tabIcon('menu') }} />
    </Tab.Navigator>
  );
}
