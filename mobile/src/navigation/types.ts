import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Every stack-level route across the three roles (shared detail screens have one definition). */
export type RootStackParamList = {
  // Tab containers (one per role)
  ClientTabs: undefined;
  LawyerTabs: undefined;
  FirmTabs: undefined;
  // Shared + detail screens pushed over the tabs
  LawyerProfile: { lawyerId: string };
  BookAppointment: { lawyerId: string };
  AppointmentDetail: { id: string };
  CaseDetail: { id: string };
  ClientDetail: { id: string };
  TeamMemberDetail: { id: string };
  AssignCase: undefined;
  Clients: undefined;
  Documents: undefined;
  Finance: undefined;
  Payments: undefined;
  Diary: undefined;
  Analytics: undefined;
  Notifications: undefined;
  Availability: undefined;
  NotificationPrefs: undefined;
  RolesPermissions: undefined;
  Settings: undefined;
  EditProfile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AuthNavigation = NativeStackNavigationProp<AuthStackParamList>;

/** Typed navigation hook for the signed-out auth flow. */
export function useAuthNavigation(): AuthNavigation {
  return useNavigation<AuthNavigation>();
}

export type ClientTabsParamList = {
  ClientHome: undefined;
  FindLawyers: undefined;
  ClientAppointments: undefined;
  ClientCases: undefined;
  ClientProfile: undefined;
};

export type LawyerTabsParamList = {
  LawyerHome: undefined;
  LawyerCases: undefined;
  LawyerCalendar: undefined;
  LawyerAppointments: undefined;
  LawyerMore: undefined;
};

export type FirmTabsParamList = {
  FirmHome: undefined;
  FirmCases: undefined;
  FirmTeam: undefined;
  FirmAppointments: undefined;
  FirmMore: undefined;
};

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Typed navigation hook used throughout the app. */
export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}
