# Design System

Updated 2026-11-22: brand is **deep forest green `#0f2c1e` on white** — no blue or gold. `src/theme/colors.ts` defines `forest` (50–950, 900 = #0f2c1e); `navy`/`gold` are kept as aliases of green tints so older components still compile. Light: white background and surfaces, `#f5f8f6` alt surface, green text/primary. Dark: `#08180f` background, white primary.

Font: **Plus Jakarta Sans** (`@expo-google-fonts/plus-jakarta-sans`, 400–800) loaded in `App.tsx`; `fontFor(weight)` in `src/theme/typography.ts` picks the family per weight (Android ignores fontWeight with custom fonts) — `Txt`, `Input` and tab labels use it. Titles use ExtraBold with slight negative tracking.

Brand assets in `assets/` (generated): `icon.png`, `adaptive-icon.png`, `splash-icon.png` (white scales of justice), `notification-icon.png`, `favicon.png`. Native splash `#0f2c1e` (dark `#08180f`) hands over to the animated `SplashScreen`.

New components: `LawyerCard` (with practice-area chips), `FirmCard` (focus areas), `OtpInput`, `ReasonSheet`, `SlotSheet`.

---

# Design System

The web app uses a "Chambers" identity: navy for authority and primary surfaces,
verdant green for confirmations, gold used sparingly, ivory/paper for warm
backgrounds. Source: `resources/css/app.css:8-86`, `resources/css/home.css:13-45`.

## Type

Web: `Inter` (UI, weights 400/500/600/700), `Source Serif 4` (display),
`Noto Nastaliq Urdu` (Urdu). Mobile uses system sans/serif faces because no font
files are bundled; this is recorded as a gap in `IMPLEMENTATION_STATUS.md`.

Mobile scale (`src/theme/tokens.ts`): xs 11, sm 13, base 15, md 16, lg 18,
xl 22, 2xl 26, 3xl 32. Use sentence case, minimum 13px for secondary text.

## Brand scales (`src/theme/palette.ts`)

| Scale | Values |
|---|---|
| Navy | 50 `#f2f5fa`, 100 `#e1e8f2`, 200 `#c3d0e3`, 300 `#97abc9`, 400 `#6580a9`, 500 `#45628d`, 600 `#344c72`, 700 `#283c5c`, 800 `#1b2b45`, 900 `#0f1e36`, 950 `#091325` |
| Verdant | 50 `#effaf3`, 100 `#d8f2e1`, 200 `#b2e3c5`, 300 `#7fcda2`, 400 `#4aaf7b`, 500 `#28925f`, 600 `#1b754b`, 700 `#165d3e`, 800 `#134a33`, 900 `#103d2b` |
| Gold | 50 `#fbf7ec`, 100 `#f4eacb`, 200 `#e9d596`, 300 `#dcbb5f`, 400 `#cfa33b`, 500 `#b8892b`, 600 `#966a22`, 700 `#774f1f` |
| Ivory / paper | `#faf8f3`, `#f4f1e9` |
| Amber | 50 `#fffbeb`, 100 `#fef3c7`, 400 `#fbbf24`, 600 `#d97706`, 900 `#78350f` |
| Red | 50 `#fef2f2`, 100 `#fee2e2`, 400 `#f87171`, 500 `#ef4444`, 600 `#dc2626`, 800 `#991b1b` |

## Semantic tokens (`src/theme/tokens.ts`)

Light: bg navy-50, surface white, surfaceAlt `#f7f9fc`, border navy-100,
text navy-900, muted navy-500, primary navy-900, accent gold-500, success
verdant-600, warning amber-600, danger red-600.

Dark: bg navy-950, surface navy-900, surfaceAlt navy-800, border navy-800,
text `#eef2f8`, primary gold-500, accent gold-300, success verdant-300,
warning amber-400, danger red-400.

Gold is an accent only: verification badges, key CTAs, small highlights. Never
use it as a large page background.

## Spacing, radius, elevation

Spacing: 4, 8, 12, 16, 20, 24, 32, 40.
Radius: 8, 12, 16, 20, pill. Cards use 12 (web `--radius-card: 0.625rem`).
Shadows are subtle: web `--shadow-card` is
`0 1px 2px rgb(15 30 54 / .06), 0 1px 1px rgb(15 30 54 / .04)`;
`--shadow-pop` is `0 10px 30px -10px rgb(15 30 54 / .25)`.

Buttons: heights 32/40/48 (sm/md/lg), weight 500, radius 12 on mobile.
Use `Button`, `Card`, `Badge`, `Input`, `Chip`, `Screen`, `States` from
`src/components` instead of ad-hoc styles.

Avoid gradients, large rounded containers, random colors, decorative
illustrations, and multiple stacked cards without hierarchy.
