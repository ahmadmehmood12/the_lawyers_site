import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Every stack-level route across the three roles (shared detail screens have one definition). */
export type RootStackParamList = {
  ClientTabs: undefined;
  LawyerTabs: undefined;
  LawyerProfile: { slug: string };
  FirmProfile: { slug: string };
  BookAppointment: { slug: string; name?: string };
  CaseDetail: { id: number };
  ClientDetail: { id: number };
  Clients: undefined;
  Diary: undefined;
  Team: undefined;
  Invoices: undefined;
  Favourites: undefined;
  Notifications: undefined;
  NotificationPrefs: undefined;
  Availability: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  TwoFactorSetup: undefined;
};

export type BootstrapStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  TwoFactor: { challenge: string };
  Register: undefined;
  ForgotPassword: undefined;
  ResetCode: { email: string };
  NewPassword: { email: string; token: string };
};

export type AuthNavigation = NativeStackNavigationProp<AuthStackParamList>;

/** Typed navigation hook for the signed-out auth flow. */
export function useAuthNavigation(): AuthNavigation {
  return useNavigation<AuthNavigation>();
}

export type ClientTabsParamList = {
  ClientHome: undefined;
  FindLawyers: { specialization?: string } | undefined;
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

export type AppNavigation = NativeStackNavigationProp<RootStackParamList>;

/** Typed navigation hook used throughout the app. */
export function useAppNavigation(): AppNavigation {
  return useNavigation<AppNavigation>();
}
