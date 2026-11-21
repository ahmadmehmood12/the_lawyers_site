# Navigation

`RootNavigator.tsx` uses a root `NavigationContainer` with a themed config.

- Unauthenticated: `AuthStack` (Login, Register, ForgotPassword).
- Locked demo session: biometric unlock screen.
- Authenticated: `AppStack` with a role-specific bottom tab navigator:
  - client → `ClientTabs` (Home, Find, Appointments, Cases, Profile)
  - lawyer → `LawyerTabs` (Home, Cases, Diary, Appointments, More)
  - firm → `FirmTabs` (Overview, Cases, Team, Appointments, More)
- Stack detail routes: LawyerProfile, BookAppointment, AppointmentDetail,
  CaseDetail, ClientDetail, TeamMemberDetail, AssignCase, Clients, Documents,
  Finance, Payments, Diary, Analytics, Notifications, Availability,
  NotificationPrefs, RolesPermissions, Settings, EditProfile.
- Added bootstrap routes: Splash and Onboarding. Splash runs before auth;
  onboarding is shown only on first launch.
- `app.json` declares the `wakeeldiary` scheme. Runtime deep-link config is not
  implemented yet.

Use `useAppNavigation`, `useAuthNavigation`, and the role tab hooks in
`src/navigation/types.ts` and `src/navigation/tabs.ts` instead of untyped casts.
Details always push; filters/quick actions use modals or sheets when added.
Avoid putting every feature in a tab bar.
