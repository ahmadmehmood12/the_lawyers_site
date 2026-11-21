# Implementation Status

Updated: 2026-11-22

The app is wired to the real Laravel REST API (`/api/v1`, Sanctum). Mock data and demo login are removed.

| Area | Status | Screens (src/screens) | API |
|---|---|---|---|
| Launch | Done | `bootstrap/SplashScreen` (animated, brand green, auto-advance, maintenance/force-update), `bootstrap/OnboardingScreen` | `GET /app/config` |
| Auth | Done | `auth/{Login,TwoFactor,Register,ForgotPassword(+ResetCode, NewPassword),VerifyEmail,BiometricUnlock}` | `auth/*` |
| Client | Done | `client/{ClientHome,FindLawyers,LawyerProfile,FirmProfile,BookAppointment,ClientAppointments,ClientCases,ClientCaseDetail,Invoices(+Favourites)}` | `home`, `lawyers*`, `firms*`, `client/*` |
| Lawyer / firm | Done (read + appointments) | `workspace/{WorkspaceHome,WorkspaceCases,WorkspaceCaseDetail,CourtDiary,WorkspaceAppointments,Availability,Clients(+ClientDetail),Team}` | `workspace/*` |
| Account | Done | `account/{Account,ProfileForms(EditProfile, ChangePassword),TwoFactorSetup,NotificationsScreens(Notifications, NotificationPrefs)}` | `account/*`, `notifications/*` |
| Push | Done (needs a dev/prod build) | `src/lib/push.ts` registers after sign-in; tap opens Notifications | `account/device-token` |

Navigation: `RootNavigator` → splash/onboarding → auth stack → verify email → biometric lock → `ClientTabs` (Home, Find, Appointments, Cases, Profile) or `LawyerTabs` (Home, Cases, Diary — Team for firms, Appointments with request badge, More).

## Not built yet (web only, no API)
Creating/editing cases, clients, hearings, tasks; document upload/download; drafting; messaging; invoices/payments; AI assistant; judgment search.

## Checks
`npm run typecheck` clean; `npx expo export --platform android` bundles; `npx expo-doctor` 20/20 (2026-11-22). No automated test suite.
