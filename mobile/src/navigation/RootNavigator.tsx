import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/data/types';
import { BiometricUnlockScreen } from '@/screens/auth/BiometricUnlockScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { AnalyticsScreen } from '@/screens/firm/AnalyticsScreen';
import { AssignCaseScreen } from '@/screens/firm/AssignCaseScreen';
import { RolesPermissionsScreen } from '@/screens/firm/RolesPermissionsScreen';
import { TeamMemberDetailScreen } from '@/screens/firm/TeamMemberDetailScreen';
import { BookAppointmentScreen } from '@/screens/client/BookAppointmentScreen';
import { ClientPaymentsScreen } from '@/screens/client/ClientPaymentsScreen';
import { LawyerProfileScreen } from '@/screens/client/LawyerProfileScreen';
import { AvailabilityScreen } from '@/screens/lawyer/AvailabilityScreen';
import { NotificationPrefsScreen } from '@/screens/lawyer/NotificationPrefsScreen';
import { AppointmentDetailScreen } from '@/screens/shared/AppointmentDetailScreen';
import { CaseDetailScreen } from '@/screens/shared/CaseDetailScreen';
import { ClientDetailScreen } from '@/screens/shared/ClientDetailScreen';
import { ClientsScreen } from '@/screens/shared/ClientsScreen';
import { CourtDiaryScreen } from '@/screens/lawyer/CourtDiaryScreen';
import { DocumentsScreen } from '@/screens/shared/DocumentsScreen';
import { EditProfileScreen } from '@/screens/shared/EditProfileScreen';
import { FinanceScreen } from '@/screens/shared/FinanceScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { SettingsScreen } from '@/screens/shared/SettingsScreen';
import { useTheme } from '@/theme';
import { ClientTabs } from './ClientTabs';
import { FirmTabs } from './FirmTabs';
import { LawyerTabs } from './LawyerTabs';
import type { AuthStackParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Auth = createNativeStackNavigator<AuthStackParamList>();

function AuthStack() {
  const { c } = useTheme();
  return (
    <Auth.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Auth.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Auth.Screen name="Register" component={RegisterScreen} options={{ title: '' }} />
      <Auth.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: '' }} />
    </Auth.Navigator>
  );
}

function AppStack({ role }: { role: Role }) {
  const { c } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      {role === 'client' ? <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} /> : null}
      {role === 'lawyer' ? <Stack.Screen name="LawyerTabs" component={LawyerTabs} options={{ headerShown: false }} /> : null}
      {role === 'firm' ? <Stack.Screen name="FirmTabs" component={FirmTabs} options={{ headerShown: false }} /> : null}

      <Stack.Screen name="LawyerProfile" component={LawyerProfileScreen} options={{ title: 'Lawyer' }} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: 'Book consultation' }} />
      <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: 'Appointment' }} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Case' }} />
      <Stack.Screen name="ClientDetail" component={ClientDetailScreen} options={{ title: 'Client' }} />
      <Stack.Screen name="TeamMemberDetail" component={TeamMemberDetailScreen} options={{ title: 'Team member' }} />
      <Stack.Screen name="AssignCase" component={AssignCaseScreen} options={{ title: 'Assign case' }} />
      <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: 'Clients' }} />
      <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
      <Stack.Screen name="Finance" component={FinanceScreen} options={{ title: 'Finance' }} />
      <Stack.Screen name="Payments" component={ClientPaymentsScreen} options={{ title: 'Payments' }} />
      <Stack.Screen name="Diary" component={CourtDiaryScreen} options={{ title: 'Court diary' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Availability' }} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="RolesPermissions" component={RolesPermissionsScreen} options={{ title: 'Roles & permissions' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Profile' }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { c, isDark } = useTheme();
  const { user, locked, biometricEnabled } = useAuth();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.surface, text: c.text, border: c.border, primary: c.primary, notification: c.accent },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {!user ? <AuthStack /> : locked && biometricEnabled ? <BiometricUnlockScreen /> : <AppStack role={user.role} />}
    </NavigationContainer>
  );
}
