import { DarkTheme, DefaultTheme, NavigationContainer, type Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';

import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/data/types';
import { useConfig } from '@/context/AppConfigContext';
import { openNotificationTarget } from '@/lib/notificationTarget';
import { onPushTapped } from '@/lib/push';
import { isOnboardingCompleted } from '@/lib/storage';
import { AccountScreen } from '@/screens/account/AccountScreen';
import { ThreadScreen } from '@/screens/account/MessagesScreens';
import { ClientCasesScreen } from '@/screens/client/ClientCasesScreen';
import { ArticleDetailScreen, ArticlesScreen } from '@/screens/shared/ArticleScreens';
import { JudgmentDetailScreen, JudgmentsScreen } from '@/screens/shared/JudgmentScreens';
import { PdfViewerScreen } from '@/screens/shared/PdfViewerScreen';
import { takePending } from '@/lib/pending';
import { GuestTabs } from './GuestTabs';
import { AiScreen } from '@/screens/workspace/AiScreen';
import { AnalyticsScreen } from '@/screens/workspace/AnalyticsScreen';
import { ProfileEditorScreen, VerificationScreen } from '@/screens/workspace/ProfileEditorScreen';
import { CaseFormScreen } from '@/screens/workspace/CaseFormScreen';
import { ClientFormScreen } from '@/screens/workspace/ClientFormScreen';
import { DocumentsScreen } from '@/screens/workspace/DocumentsScreen';
import { DraftEditorScreen, DraftsScreen } from '@/screens/workspace/DraftsScreen';
import { HearingFormScreen } from '@/screens/workspace/HearingFormScreen';
import { InvoiceDetailScreen, InvoiceFormScreen, WorkspaceInvoicesScreen } from '@/screens/workspace/InvoiceScreens';
import { TasksScreen } from '@/screens/workspace/TasksScreen';
import { WorkspaceAppointmentsScreen } from '@/screens/workspace/WorkspaceAppointmentsScreen';
import { NotificationPrefsScreen, NotificationsScreen } from '@/screens/account/NotificationsScreens';
import { ChangePasswordScreen, EditProfileScreen } from '@/screens/account/ProfileForms';
import { TwoFactorSetupScreen } from '@/screens/account/TwoFactorSetupScreen';
import { BiometricUnlockScreen } from '@/screens/auth/BiometricUnlockScreen';
import { ForgotPasswordScreen, NewPasswordScreen, ResetCodeScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { TwoFactorScreen } from '@/screens/auth/TwoFactorScreen';
import { VerifyEmailScreen } from '@/screens/auth/VerifyEmailScreen';
import { OnboardingScreen } from '@/screens/bootstrap/OnboardingScreen';
import { SplashScreen } from '@/screens/bootstrap/SplashScreen';
import { BookAppointmentScreen } from '@/screens/client/BookAppointmentScreen';
import { ClientCaseDetailScreen } from '@/screens/client/ClientCaseDetailScreen';
import { FirmProfileScreen } from '@/screens/client/FirmProfileScreen';
import { FavouritesScreen, InvoicesScreen } from '@/screens/client/InvoicesScreen';
import { LawyerProfileScreen } from '@/screens/client/LawyerProfileScreen';
import { AvailabilityScreen } from '@/screens/workspace/AvailabilityScreen';
import { ClientDetailScreen, ClientsScreen } from '@/screens/workspace/ClientsScreen';
import { CourtDiaryScreen } from '@/screens/workspace/CourtDiaryScreen';
import { TeamScreen } from '@/screens/workspace/TeamScreen';
import { WorkspaceCaseDetailScreen } from '@/screens/workspace/WorkspaceCaseDetailScreen';
import { fontFamily, useTheme } from '@/theme';
import { ClientTabs } from './ClientTabs';
import { LawyerTabs } from './LawyerTabs';
import { navigationRef } from './navigationRef';
import type { BootstrapStackParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Bootstrap = createNativeStackNavigator<BootstrapStackParamList>();

type BootstrapProps = {
  stage: 'splash' | 'onboarding';
  appConfig: ReturnType<typeof useConfig>;
  onSplashFinish: () => void;
  onOnboardingFinish: () => void;
};

function BootstrapStack({ stage, appConfig, onSplashFinish, onOnboardingFinish }: BootstrapProps) {
  return (
    <Bootstrap.Navigator key={stage} screenOptions={{ headerShown: false }}>
      {stage === 'splash' ? (
        <Bootstrap.Screen name="Splash">
          {() => (
            <SplashScreen
              config={appConfig.config}
              loading={appConfig.loading}
              error={appConfig.error}
              onRetry={appConfig.refetch}
              onFinish={onSplashFinish}
            />
          )}
        </Bootstrap.Screen>
      ) : (
        <Bootstrap.Screen name="Onboarding">{() => <OnboardingScreen onFinish={onOnboardingFinish} />}</Bootstrap.Screen>
      )}
    </Bootstrap.Navigator>
  );
}

/** Signed out: browse lawyers, firms, articles and judgments; the sign-in screens open on top. */
function GuestStack() {
  const { c } = useTheme();
  const auth = { headerShown: true, headerTransparent: true, headerTitle: '', headerTintColor: '#ffffff', headerBackButtonDisplayMode: 'minimal' as const };
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: c.bg }, headerTintColor: c.text, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal', headerTitleStyle: { fontFamily: fontFamily.bold, fontSize: 17 }, contentStyle: { backgroundColor: c.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="GuestTabs" component={GuestTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LawyerProfile" component={LawyerProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="FirmProfile" component={FirmProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="JudgmentDetail" component={JudgmentDetailScreen} options={{ title: 'Judgment' }} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ title: 'PDF' }} />
      <Stack.Screen name="Articles" component={ArticlesScreen} options={{ title: '' }} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="Login" component={LoginScreen} options={auth} />
      <Stack.Screen name="TwoFactor" component={TwoFactorScreen} options={auth} />
      <Stack.Screen name="Register" component={RegisterScreen} options={auth} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={auth} />
      <Stack.Screen name="ResetCode" component={ResetCodeScreen} options={auth} />
      <Stack.Screen name="NewPassword" component={NewPasswordScreen} options={auth} />
    </Stack.Navigator>
  );
}

function CaseDetail({ route }: { route: { params: RootStackParamList['CaseDetail'] } }) {
  const { role } = useAuth();
  return role === 'client' ? <ClientCaseDetailScreen id={route.params.id} /> : <WorkspaceCaseDetailScreen id={route.params.id} />;
}

function ClientDetail({ route }: { route: { params: RootStackParamList['ClientDetail'] } }) {
  return <ClientDetailScreen id={route.params.id} />;
}

function AppStack({ role }: { role: Role }) {
  const { c } = useTheme();
  // A visitor who tapped "Book consultation" before signing in continues straight to booking.
  useEffect(() => {
    const pending = takePending();
    if (pending && role === 'client') {
      const t = setTimeout(() => navigationRef.isReady() && navigationRef.navigate(pending.screen, pending.params), 350);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [role]);
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: { fontFamily: fontFamily.bold, fontSize: 17 },
        contentStyle: { backgroundColor: c.bg },
        animation: 'slide_from_right',
      }}
    >
      {role === 'client'
        ? <Stack.Screen name="ClientTabs" component={ClientTabs} options={{ headerShown: false }} />
        : <Stack.Screen name="LawyerTabs" component={LawyerTabs} options={{ headerShown: false }} />}
      <Stack.Screen name="LawyerProfile" component={LawyerProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="FirmProfile" component={FirmProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="BookAppointment" component={BookAppointmentScreen} options={{ title: 'Book consultation' }} />
      <Stack.Screen name="CaseDetail" component={CaseDetail} options={{ title: 'Case' }} />
      <Stack.Screen name="ClientDetail" component={ClientDetail} options={{ title: 'Client' }} />
      <Stack.Screen name="Clients" component={ClientsScreen} options={{ title: 'Clients' }} />
      <Stack.Screen name="Diary" component={CourtDiaryScreen} options={{ title: '' }} />
      <Stack.Screen name="Team" component={TeamScreen} options={{ title: '' }} />
      <Stack.Screen name="Invoices" component={InvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="Favourites" component={FavouritesScreen} options={{ title: 'Saved lawyers' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="NotificationPrefs" component={NotificationPrefsScreen} options={{ title: 'Notification settings' }} />
      <Stack.Screen name="Availability" component={AvailabilityScreen} options={{ title: 'Consultation hours' }} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change password' }} />
      <Stack.Screen name="TwoFactorSetup" component={TwoFactorSetupScreen} options={{ title: 'Two-factor authentication' }} />
      <Stack.Screen name="Account" component={AccountScreen} options={{ title: 'Account & settings' }} />
      <Stack.Screen name="Appointments" component={WorkspaceAppointmentsScreen} options={{ title: '' }} />
      <Stack.Screen name="MyCases" component={ClientCasesScreen} options={{ title: '' }} />
      <Stack.Screen name="CaseForm" component={CaseFormScreen} options={({ route }) => ({ title: route.params?.id ? 'Edit case' : 'New case' })} />
      <Stack.Screen name="ClientForm" component={ClientFormScreen} options={({ route }) => ({ title: route.params?.id ? 'Edit client' : 'New client' })} />
      <Stack.Screen name="HearingForm" component={HearingFormScreen} options={({ route }) => ({ title: route.params.hearingId ? 'Hearing outcome' : 'Schedule hearing' })} />
      <Stack.Screen name="Tasks" component={TasksScreen} options={{ title: 'Tasks' }} />
      <Stack.Screen name="Documents" component={DocumentsScreen} options={{ title: 'Documents' }} />
      <Stack.Screen name="Drafts" component={DraftsScreen} options={{ title: 'Drafting' }} />
      <Stack.Screen name="DraftEditor" component={DraftEditorScreen} options={{ title: 'Draft' }} />
      <Stack.Screen name="Thread" component={ThreadScreen} options={({ route }) => ({ title: route.params.title })} />
      <Stack.Screen name="WorkspaceInvoices" component={WorkspaceInvoicesScreen} options={{ title: 'Invoices' }} />
      <Stack.Screen name="InvoiceDetail" component={InvoiceDetailScreen} options={{ title: 'Invoice' }} />
      <Stack.Screen name="InvoiceForm" component={InvoiceFormScreen} options={{ title: 'New invoice' }} />
      <Stack.Screen name="Ai" component={AiScreen} options={{ title: 'AI assistant' }} />
      <Stack.Screen name="Judgments" component={JudgmentsScreen} options={{ title: 'Reported judgments' }} />
      <Stack.Screen name="JudgmentDetail" component={JudgmentDetailScreen} options={{ title: 'Judgment' }} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} options={{ title: 'PDF' }} />
      <Stack.Screen name="Articles" component={ArticlesScreen} options={{ title: '' }} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: 'Article' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
      <Stack.Screen name="ProfileEditor" component={ProfileEditorScreen} options={{ title: 'My public profile' }} />
      <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: 'Verification' }} />
    </Stack.Navigator>
  );
}

export function RootNavigator() {
  const { c, isDark } = useTheme();
  const { status, user, role, locked, biometricEnabled, refreshUser } = useAuth();
  const appConfig = useConfig();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [stage, setStage] = useState<'splash' | 'onboarding' | 'app'>('splash');

  useEffect(() => {
    let active = true;
    isOnboardingCompleted().then((done) => {
      if (active) {
        setOnboardingDone(done);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const finishSplash = async () => {
    const done = onboardingDone ?? (await isOnboardingCompleted());
    setOnboardingDone(done);
    setStage(done ? 'app' : 'onboarding');
  };

  const finishOnboarding = () => {
    setOnboardingDone(true);
    setStage('app');
  };

  // A tapped push opens the notifications list and refreshes the unread counters.
  useEffect(() => onPushTapped((data) => {
    void refreshUser().catch(() => undefined);
    if (navigationRef.isReady()) {
      openNotificationTarget(navigationRef, data, role);
    }
  }), [refreshUser, role]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: NavTheme = {
    ...base,
    colors: { ...base.colors, background: c.bg, card: c.surface, text: c.text, border: c.border, primary: c.primary, notification: c.accent },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {stage === 'splash' || stage === 'onboarding' ? (
        <BootstrapStack
          stage={stage}
          appConfig={appConfig}
          onSplashFinish={() => void finishSplash()}
          onOnboardingFinish={finishOnboarding}
        />
      ) : status === 'loading' ? (
        <SplashScreen config={appConfig.config} loading error={null} onRetry={appConfig.refetch} onFinish={() => undefined} />
      ) : !user ? (
        <GuestStack />
      ) : !user.email_verified ? (
        <VerifyEmailScreen />
      ) : locked && biometricEnabled ? (
        <BiometricUnlockScreen />
      ) : role ? (
        <AppStack role={role} />
      ) : (
        <AccountScreen />
      )}
    </NavigationContainer>
  );
}
