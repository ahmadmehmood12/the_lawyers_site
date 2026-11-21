# Development Guidelines

## Platform versions

This app targets Expo SDK 58 (`expo ~58.0.0`), React Native 0.88.1, React
19.3.0, React Native Web 0.21.x, and TypeScript 6.0.x. Keep all `expo-*` packages
aligned with SDK 58 using `npx expo install --fix`.

The New Architecture is always enabled in SDK 58; do not add `newArchEnabled` to
app config. Native splash config belongs to the `expo-splash-screen` config
plugin, not the removed top-level `splash` field.

## Commands

Run from `mobile/`:

- `npm run typecheck` — TypeScript check (no emit).
- `npm start` — Expo dev server; `npm run ios` / `npm run android` for simulators.
- `npx expo start --web` is available through `npm run web`.

There is no mobile test runner configured. Do not add one without approval.

## Conventions

- TypeScript strict mode; use the `@/` alias.
- Functional components with typed props; no `any` unless unavoidable.
- Curly braces for all control structures.
- Reuse theme tokens; no raw hex values outside `src/theme` except when matching
  an exact web token already documented in `DESIGN_SYSTEM.md`.
- Reuse `src/components` before adding new UI.
- Screens must render loading, error, empty, and backend-gap states.
- Forms use `KeyboardAvoidingView`/`ScrollView` and explicit validation messages.
- Do not log tokens, personal data, or raw API responses.

## Before changing API code

1. Read `docs/API_INTEGRATION.md`.
2. Verify the Laravel route and controller in the backend.
3. Update the endpoint registry and typed service.
4. Update `docs/FEATURES.md` and `docs/IMPLEMENTATION_STATUS.md`.

## Before finishing a task

- Run `npm run typecheck`.
- Check `git status` and ensure no generated `.expo/` or `node_modules/` files
  are staged.
- Update status documentation if behavior, architecture, or API contracts changed.
