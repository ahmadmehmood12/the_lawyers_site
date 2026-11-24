import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '@/context/AuthContext';
import { MessagesScreen } from '@/screens/account/MessagesScreens';
import { MoreScreen } from '@/screens/account/MoreScreen';
import { ClientAppointmentsScreen } from '@/screens/client/ClientAppointmentsScreen';
import { ClientHomeScreen } from '@/screens/client/ClientHomeScreen';
import { FindLawyersScreen } from '@/screens/client/FindLawyersScreen';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { ClientTabsParamList } from './types';

const Tab = createBottomTabNavigator<ClientTabsParamList>();

/** Client bottom bar: the main links; everything else is under More. */
export function ClientTabs() {
  const { c } = useTheme();
  const { user } = useAuth();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="ClientHome" component={ClientHomeScreen} options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="FindLawyers" component={FindLawyersScreen} options={{ title: 'Find', tabBarIcon: tabIcon('search') }} />
      <Tab.Screen name="ClientAppointments" component={ClientAppointmentsScreen} options={{ title: 'Appointments', tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="ClientMessages" component={MessagesScreen} options={{ title: 'Messages', tabBarIcon: tabIcon('message-circle'), tabBarBadge: user?.unread.messages || undefined, tabBarBadgeStyle: { backgroundColor: c.danger } }} />
      <Tab.Screen name="ClientMore" component={MoreScreen} options={{ title: 'More', tabBarIcon: tabIcon('grid') }} />
    </Tab.Navigator>
  );
}
