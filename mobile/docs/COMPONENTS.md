# Components

Reusable UI lives in `src/components` and is exported from `src/components/index.ts`.

| Component | Purpose |
|---|---|
| `Screen` | Safe-area wrapper, background, padding, scroll, refresh control, footer |
| `Txt` | Themed text with variant/tone/weight presets |
| `Button` | Primary/secondary/ghost/danger/success/accent button with icon/loading states |
| `Card` | Surface container with subtle border/shadow |
| `Badge` | Status pill mapped to semantic tones |
| `Avatar` | Image or initials avatar |
| `Stat` | KPI tile |
| `ListRow` | Tappable list row with leading/trailing content |
| `SectionHeader` | Section title with optional action |
| `Chip` | Filter/selection chip |
| `Input` | Labeled input with icon, error, hint, password toggle |
| `SegmentedControl` | Small option switcher |
| `EmptyState`, `ErrorState`, `Loading` | Loading/empty/error UI |
| `Skeleton`, `SkeletonCard` | Loading placeholders |
| `Divider`, `ProgressBar`, `IconButton`, `KeyValue` | Small primitives |
| `Alert` | Inline inline message with tone |
| `AppHeader` | Dashboard header with greeting and notification affordance |
| `BackendGapState` | Explicit state for verified-but-unavailable backend features |
| `DemoOnly` | Renders mock-only screens in demo mode; otherwise shows `BackendGapState` |

Shared hooks live in `src/hooks`. `useAppConfig` loads the verified app-config
endpoint with abort support; `useDebouncedValue` delays expensive filter/search
work.

Feature-specific components belong under `src/features/<feature>` and must only
be promoted to `src/components` when used by more than one feature.

Do not create a new component when an existing one can be configured with props.
Keep touch targets at least 44x44 and always provide accessibility labels on
icon-only controls.
