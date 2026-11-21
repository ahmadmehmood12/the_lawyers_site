# Performance

Rules for this codebase:

- `src/api/client.ts` sets a request timeout and passes `AbortSignal` to fetch.
- Search inputs must debounce before triggering a request.
- Lists use `FlatList`/`FlashList`-style virtualization when data becomes
  available; do not map large arrays into ScrollView.
- All collection endpoints must be server-paginated. Never request an entire
  lawyer, case, judgment, or appointment dataset.
- Use skeletons (`Skeleton`, `SkeletonCard`) for initial loads and
  `RefreshControl` through `Screen` for pull-to-refresh.
- Memoize expensive list rows and route options.
- Cache successful app-config reads for the current launch; invalidate after
  force-update/maintenance changes.
- Images should use cached, resized URLs supplied by the backend. Image caching
  is pending because `expo-image` is not installed.
- Backend eager loading is required for lawyer listings to avoid N+1 queries;
  this is documented in `API_INTEGRATION.md`, not implemented client-side.
