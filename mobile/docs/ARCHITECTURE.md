# Architecture

## Structure

```
mobile/
  App.tsx              providers + root navigator
  index.ts             Expo entry
  src/
    api/               client, endpoint registry, typed services
    components/        reusable UI kit
    context/           auth session context
    data/              demo-mode types and mock data (never production data)
    features/          feature-specific containers
    hooks/             shared hooks
    lib/               formatting helpers
    navigation/        typed stacks, tabs, params
    screens/           route screens by area
    theme/             tokens, palette, theme provider
```

`@` is aliased to `src/` in `tsconfig.json` and `babel.config.js`.

## Data flow

1. `App.tsx` mounts gesture handler, safe area, theme, auth, navigator.
2. `SplashScreen` reads `GET /api/app/config` through `src/api/client.ts`.
3. `src/api/client.ts` owns base URL, timeout, abort, JSON parsing, and typed
   errors. It is the only place allowed to call `fetch`.
4. Screens use API services via hooks. Loading/error/empty states come from
   `src/components/States.tsx`.
5. Missing backend capabilities render a documented backend-gap state. They
   never read from `src/data/mock.ts` unless demo mode is explicitly enabled.

## Configuration

`EXPO_PUBLIC_API_BASE_URL` is required for live data. The legacy value in
`app.json → extra.apiBaseUrl` is read through `expo-constants` as a fallback.
`EXPO_PUBLIC_DEMO_MODE=1` enables the preserved prototype with mock data; it is
off by default and must never be enabled in a production build.

## Theme

`ThemeProvider` supports light, dark, and system. Screens read semantic tokens
from `useTheme()`; raw palette values belong only in `src/theme/palette.ts`.

## Backend boundary

No business rules are reimplemented on the client. Status labels, authorization,
plan gating, pagination, and filtering must come from the backend. Where an
endpoint is absent, `docs/API_INTEGRATION.md` records the proposed contract and
the client shows a clear unavailability state.
