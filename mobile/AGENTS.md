# Mobile Agent Instructions

Read this file before every task in `mobile/`.

1. Read the relevant document in `docs/` before changing code. Start with `docs/README.md`.
2. Follow the existing architecture and design system in `src/theme` and `src/components`. Reuse before creating.
3. Check the Laravel backend (`routes/`, `app/Http/Controllers`, `app/Models`, `database/migrations`) before changing any API integration. The database is the source of truth.
4. Never assume a field, endpoint, status, or permission exists. Verify it. If it does not exist, document the gap in `docs/API_INTEGRATION.md`; do not invent it in the client.
5. Do not introduce fake data. The app talks to the real `/api/v1` (Sanctum); demo mode and mock data were removed on 2026-11-22.
6. Do not add dependencies without approval. Prefer what Expo SDK 58 already provides. Approved: expo-secure-store, expo-notifications, expo-device, expo-linear-gradient, expo-clipboard, @expo-google-fonts/plus-jakarta-sans.
11. Every new endpoint follows the root `CLAUDE.md` API + Swagger rules (same backend service as the web, docs in `app/Swagger`).
7. Preserve existing working screens and navigation. Improve incrementally.
8. Update `docs/IMPLEMENTATION_STATUS.md` after every completed feature or phase.
9. Keep tokens, spacing, colors, and icons consistent with `docs/DESIGN_SYSTEM.md`.
10. Run `npm run typecheck` in `mobile/` after TypeScript changes.
