import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { CourtDiaryScreen } from '@/screens/lawyer/CourtDiaryScreen';
import { LawyerAppointmentsScreen } from '@/screens/lawyer/LawyerAppointmentsScreen';
import { LawyerCasesScreen } from '@/screens/lawyer/LawyerCasesScreen';
import { LawyerHomeScreen } from '@/screens/lawyer/LawyerHomeScreen';
import { LawyerMoreScreen } from '@/screens/lawyer/LawyerMoreScreen';
import { useTheme } from '@/theme';
import { tabIcon, tabScreenOptions } from './tabOptions';
import type { LawyerTabsParamList } from './types';

const Tab = createBottomTabNavigator<LawyerTabsParamList>();

export function LawyerTabs() {
  const { c } = useTheme();
  return (
    <Tab.Navigator screenOptions={tabScreenOptions(c)}>
      <Tab.Screen name="LawyerHome" component={LawyerHomeScreen} options={{ title: 'Home', tabBarIcon: tabIcon('home') }} />
      <Tab.Screen name="LawyerCases" component={LawyerCasesScreen} options={{ title: 'Cases', tabBarIcon: tabIcon('folder') }} />
      <Tab.Screen name="LawyerCalendar" component={CourtDiaryScreen} options={{ title: 'Diary', tabBarIcon: tabIcon('calendar') }} />
      <Tab.Screen name="LawyerAppointments" component={LawyerAppointmentsScreen} options={{ title: 'Appointments', tabBarIcon: tabIcon('clock') }} />
      <Tab.Screen name="LawyerMore" component={LawyerMoreScreen} options={{ title: 'More', tabBarIcon: tabIcon('menu') }} />
    </Tab.Navigator>
  );
}
