# Wakeel Diary — Mobile app (Expo prototype)

A navigable **React Native + Expo + TypeScript** UI prototype for the Wakeel Diary
LegalTech platform, covering all three roles: **Client**, **Lawyer** and **Law firm**.
It shares the web app's visual identity (navy / gold / verdant, Inter type, rounded
cards, light + dark) and is organised so the mock data can be swapped for the real
Laravel API (Sanctum) with minimal change.

> This is a **UI prototype**. All data is local mock data (`src/data/mock.ts`); there is no
> backend call yet. The web application is not touched by this project.

## Run it

```bash
cd mobile
npm install
npx expo start          # press i (iOS), a (Android), or scan the QR in Expo Go
```

If a dependency version warning appears, let Expo reconcile it:

```bash
npx expo install --fix
```

Other scripts: `npm run ios`, `npm run android`, `npm run web`, `npm run typecheck`.

## Signing in

Pick a role on the login screen (**Client / Lawyer / Law firm**) and tap **Sign in** — no
real credentials are needed. If the device has Face ID / fingerprint enrolled, the
biometric button and the lock screen are live (via `expo-local-authentication`). Enable the
lock under **Settings → Face ID / fingerprint unlock**.

## What's inside

| Role | Screens |
|------|---------|
| **Client** | Home dashboard, Find lawyers (search + filters), Lawyer profile, Book appointment (date/slot/mode), Appointments, Appointment detail, Cases, Case detail, Payments & invoices, Notifications, Profile, Settings |
| **Lawyer** | Dashboard (KPIs, cause list, requests, tasks), Cases (filter/search), Court diary, Appointments (accept / reschedule / decline), Clients, Client detail, Documents, Finance (invoices + receipts), Availability & working hours, Notification preferences, Profile, Settings |
| **Law firm** | Overview (analytics, team workload, collection rate), Cases + Assign case, Team, Team member detail, Appointments, Clients, Court diary, Finance, Analytics, Roles & permissions, Settings |

Shared: biometric unlock, light/dark/system theme, role-based bottom tabs, and full
loading / empty / error / success states.

## Structure

```
src/
  theme/        design tokens (palette copied from the web app) + ThemeProvider (light/dark/system)
  components/   reusable kit — Txt, Button, Card, Badge, Avatar, Stat, ListRow, Chip,
                Input, SegmentedControl, Alert, Skeleton, States, AppHeader, …
  data/         domain types (mirror the Laravel models) + realistic mock data
  lib/          formatting (PKR, dates) and status → badge-tone helpers
  context/      AuthContext (role, demo login, biometric lock/unlock)
  navigation/   typed param lists, the three role tab navigators, role stacks, RootNavigator
  screens/      auth / client / lawyer / firm / shared
```

## Wiring up the real API later

The data layer is deliberately isolated so the backend can be added without touching
screens:

1. Keep `src/data/types.ts` as the shared contract (it mirrors the Laravel models).
2. Replace the imports from `src/data/mock.ts` with a small API client (e.g. `src/data/api.ts`)
   that calls the Laravel endpoints and returns the same types. Add a thin data hook
   (React Query or a `useResource` wrapper) per screen.
3. Put the Sanctum token exchange in `AuthContext.login()` (POST credentials → store the
   token in `expo-secure-store`, send it as a `Bearer` header). The demo-user switch there
   becomes the real session.
4. `app.json → extra.apiBaseUrl` already holds the base URL; read it via `expo-constants`.
5. Register the device's FCM token with the platform's `POST /account/device-token` endpoint
   after login (the web app already stores `users.fcm_token`).

Nothing in `screens/` imports a network layer directly, so each screen becomes real by
changing only its data source.
