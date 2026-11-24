# API Integration

Source of truth: Laravel `routes/api/v1.php` and Swagger at `https://<host>/api/documentation` (63 operations). Root docs: `docs/API/API-Documentation.md`.

## Client layer
- `src/api/client.ts` — the only HTTP layer: base URL from `EXPO_PUBLIC_API_BASE_URL` (or `app.json` `extra.apiBaseUrl` = `https://thelawyer.duckdns.org/api`, the production server); timeout + AbortSignal; adds `Authorization: Bearer <token>`; a 401 on an authenticated call signs the user out.
- `src/api/v1.ts` — typed services: `authApi`, `accountApi`, `directoryApi`, `clientApi`, `workspaceApi`; each returns `data` from the `{status, message, data, meta}` envelope; lists return `{items, meta}`. `fieldErrors(e)` maps 422 `errors` to `{field: message}`; `errorMessage(e)` gives a user-facing message.
- `src/api/models.ts` — response types taken from the real payloads.
- `src/hooks/useQuery.ts` — loading / error / pull-to-refresh state for screens.

## Rules
- Never call web (Inertia) URLs. Never add fake data in production.
- New endpoint: add it on the backend first (same service/FormRequest as the web, Swagger docs in `app/Swagger`, see root `CLAUDE.md`), then a typed wrapper in `v1.ts` and a model in `models.ts`.
- Workspace list endpoints return Laravel paginators (`{data, current_page, last_page, total}`) inside `data`; public lists use the API `meta`.
