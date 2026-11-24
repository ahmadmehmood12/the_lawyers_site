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

## Added 2026-11-24 (all through the web-bridge API = the web's own actions)
| Area | Screens |
|---|---|
| Cases / clients | `workspace/CaseFormScreen` (new/edit), `ClientFormScreen` (new/edit), case file: Edit, hearings (schedule, reschedule, cancel, outcome via `HearingFormScreen`), tasks, documents |
| Tasks | `workspace/TasksScreen` (+ `TaskSheet`, `TaskRow`) |
| Documents | `workspace/DocumentsScreen` (lawyers: vault, filters, upload, open; clients: shared docs + upload) |
| Drafting | `workspace/DraftsScreen` (list, new from template), `DraftEditorScreen` (WebView rich text, save, review/approve, PDF/Word export) |
| Messages | `account/MessagesScreens` (inbox, new conversation, thread with attachments, 8 s refresh) — lawyers and clients |
| Invoices | `workspace/InvoiceScreens` (list + totals, new invoice with items, detail: issue, void, record payment (idempotency key), PDF, receipts); clients: invoice detail + PDF + receipts |
| AI | `workspace/AiScreen` |
| Judgments | `shared/JudgmentScreens` (search with excerpts, court/judge/bench/pair/citation filters; detail, PDF view, plan-gated download) |
| Navigation | bottom bar — lawyer/firm: Home · Cases · Diary · Messages · More; client: Home · Find · Appointments · Messages · More. `account/MoreScreen` = tile grid of every other module (permission-aware, badges) + Account |
| Shared kit | `components/Form.tsx` (Picker, DateField, TimeField, SwitchRow, useForm, FormScreen), `api/web.ts` (webPage/webPost/webPut, formData uploads, openFile download+share, uuid) |
New dependencies: expo-document-picker, expo-sharing, react-native-webview.

## Checks
`npm run typecheck` clean; `npx expo export --platform android` bundles (2026-11-24). No automated test suite.
