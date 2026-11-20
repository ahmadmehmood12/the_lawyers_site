import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { ClientAppointmentsScreen } from '@/screens/client/ClientAppointmentsScreen';
import { ClientCasesScreen } from '@/screens/client/ClientCasesScreen';
import { ClientHomeScreen } from '@/screens/client/ClientHomeScreen';
import { ClientProfileScreen } from '@/screens/client/ClientProfileScreen';
import { FindLawyersScreen } from '@/screens/client/FindLawyersScreen';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { ClientTabsParamList } from './types';

const Tab = createBottomTabNavigator<ClientTabsParamList>();

export function ClientTabs() {
  const { c } = useTheme();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="FindLawyers" component={FindLawyersScreen} options={{ title: 'Find', tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="ClientAppointments" component={ClientAppointmentsScreen} options={{ title: 'Appointments', tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="ClientCases" component={ClientCasesScreen} options={{ title: 'Cases', tabBarIcon: tabIcon('folder') }} />
      <Tab.Screen name="ClientProfile" component={ClientProfileScreen} options={{ title: 'Profile', tabBarIcon: tabIcon('user') }} />
    </Tab.Navigator>
  );
}
