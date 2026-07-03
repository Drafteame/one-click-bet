# CLAUDE.md — One Click Bet

Project memory for any Claude session opened in this repo. Read first; **keep this file updated in the same commit as any change that meaningfully shifts architecture, conventions, branch model, or "where things live."**

---

## What this is

**One Click Bet** — an exploration repo forked from `Drafteame/draftea-momios-prototype` (the buttonPreviewMomios progressive-engagement prototype) and used as a base for new explorations. The original repo is left untouched; iterate here.

The current baseline is a high-fidelity interactive prototype of a **Draftea sportsbook bet-slip CTA** that escalates user engagement across 5 tiers (T0 → T4) using motion, light, and behavior — **not color shifts**. Built from Figma "Buscador" frames via the Figma MCP connector.

**Live preview:** https://drafteame.github.io/one-click-bet/
**Repo:** `Drafteame/one-click-bet` (public)
**Forked from:** `Drafteame/draftea-momios-prototype` (private)
**Local path:** `~/development/one-click-bet`

## Stack

- **Vite 5** + **React 18** + **TypeScript (strict)** + **Tailwind 3** + **Framer Motion 11**
- Build: `npm run build` (uses `vite build` only — `tsc` is intentionally **dropped** because pre-existing TS errors in `App.tsx`, `BetSlipShell.tsx` etc. would block CI. Run type-checking via `npm run typecheck` when you need it.)
- Dev: `npm run dev` → **http://localhost:5174/one-click-bet/** (note the subpath — root `/` 302-redirects there because of `base:` in `vite.config.ts`).

## Tier system

Cumulative odds → tier via the pure `tierForOdds()` function:

| Tier | Name | Threshold |
|---|---|---|
| T0 | Default | < 2.00x |
| T1 | Intermedio | ≥ 2.00x |
| T2 | Súper | ≥ 5.00x |
| T3 | Máximo | ≥ 15.00x |
| T4 | Legendario | ≥ 50.00x |

Tiers are **additive** — T3 includes everything in T2, etc. Differentiate with `cfg.tier{N}.*` overrides.

## File map

| File | Purpose |
|---|---|
| `src/BetSlipSheet.tsx` | **The bet slip on `main`.** ONE persistent glass surface that morphs its *shape* (height + corner radius, bottom-anchored) between the collapsed `ButtonPreviewMomios` capsule and the expanded purple-glass card (straight at 1 / parlay at 2+) — a liquid morph, never an empty frame. Driven by a single `collapseP` motion value; the collapse is gesture-driven (drag shrinks it with the finger). Owns gesture-collapse, swipe-**up**-to-open-full-sheet, tap-to-expand, swipe-to-confirm (end-of-track gate + loader), appear/collapse squash-stretch pulses. |
| `src/BetSlipFullSheet.tsx` | Full-screen "Resumen de tu entrada" sheet (Figma 33304:83122), opened from the parlay **Lista** tab. Slides up over the phone frame; swipe-down or × closes it AND collapses the bet slip. Header trash clears the slip. Includes the free-bet/Booster promos box (illustrations `freebet.png`/`booster.png`), accept-odds checkbox, and swipe-to-play. Toggles + checkbox are CSS controls. One asset still pending: the countdown **clock icon** (countdown pills show time text without it). |
| `src/EntryCreatedOverlay.tsx` | **Success animation** (swipe-to-confirm AND lightning bet) — a green "¡Entrada creada!" card that enters via a **circular clip-path reveal** (`greenCircleIn`) + content pop, fires a **green spark burst + squash/stretch pop + glow flash** on reveal-complete (`onCovered`), then a **genie flight** into "Mis entradas" (springs launched together, no anticipation; position-driven squash/stretch, shrink envelope, borderRadius/rotation; **fades out ~3px before the tab** so it never overlaps). `onCatch` bumps the tab icon at the vanish point; `onDone` triggers the count badge + "¿Reusar?" prompt. **Lightning bets** pass `lightning` → a smaller **ticket/stub** variant (notched via CSS mask, stroke+glow via wrapper `drop-shadow`). All timing/geometry in its `cfg`. |
| `src/ButtonPreviewMomios.tsx` | The collapsed bet-slip pill (~1.7k LOC, all tier-gated effects; effects OFF on `main` via the master switch → static pill). Rendered by `BetSlipSheet` as the collapsed state. Full animated version preserved on the `bet-slip-progression` branch. |
| `src/buttonProgressionConfig.ts` | **Central tunables.** Every magic number lives here with a comment. |
| `src/types.ts` | `Tier = 0 | 1 | 2 | 3 | 4`, `Selection`, `TierConfig`. |
| `src/App.tsx` | Top-level orchestration: selection state, debug overlay, `selectionsForTier(N)` helper. |
| `src/HomeScreen.tsx` | `MOCK_PICKS` array drives the pick cards. Owns the two-tier **sticky header** (`HomeScreenChrome` — topbar + match tabs/pills pin, league tabs scroll away), the `Navbar` (entry-count badge), and `useLongPress` (long-press a pick → **Lightning Straight Bet**, tap → normal select). |
| `src/BetSlipShell.tsx` | Entry/exit + velocity-derived landing squash wrapper. |
| `src/SlotNumber.tsx` | Per-digit slot animation for changing numbers. |
| `src/OddsRipple.tsx` | T3+ ghost-text ripple component. |
| `src/OutlineRipple.tsx` | T2+ button-outline ripple. |
| `src/OddsEffects.tsx` | `<OddsSmokeEffect>` (T3 odds variant). |
| `EFFECTS.md` | **Canonical effect catalog** — every animation/microinteraction, grouped by tier. |

## Conventions

- **Effects gated by tier** with `tier === N` (exclusive) or `tier >= N` (inclusive). Watch this distinction — it's the #1 source of bugs when adding a new tier.
- **Every tunable** goes in `buttonProgressionConfig.ts` under `cfg.tier{N}.*` or shared sections like `cfg.breath` / `cfg.sparkles`. No magic numbers in the component.
- **`prefers-reduced-motion`** must be respected — gate ambient effects with `!reduced`.
- **`EFFECTS.md` is updated in the same commit** as any added/removed/retuned/moved effect. Don't expand README's effect section — point users to EFFECTS.md.
- **Debug overlay** (`?debug=true`) has tier-jump buttons, speed-scale (1× or 3× slow), and a T3 odds-effect toggle (flames / smoke). Add a button when you add a tier.
- **Effects that extend outside the pill** must be siblings of the rounded shell (which has `overflow:hidden`), not children. The fire-sparks wrapper / outline-ripple / odds-ripple already follow this.

## ⚠️ Master switch — progression animations are OFF on `main`

`cfg.animationsEnabled` in `src/buttonProgressionConfig.ts` is **`false`** on `main`. The bet-slip button renders **static**: all tier ambient effects, on-event micro-interactions, tier-crossing flourishes, the T4 vignette, haptics, and sound are suppressed. Only the slip **entry/exit** (`BetSlipShell`) and **number rolls** (`SlotNumber`) still play. The fully-animated version is snapshotted on the **`bet-slip-progression`** branch. Flip the flag to `true` to restore everything.

Wiring (intentionally minimal — reuses the reduced-motion gates): `ButtonPreviewMomios` OR-s the flag into `reduced`; `App.tsx` OR-s it into `reducedMotion` and gates the vignette opacity; `haptics.ts` early-returns. See the "Master switch" section in `EFFECTS.md`. When adding a NEW effect, gate it on `!reduced` (or `!reducedMotion` in App) so the master switch keeps covering it automatically.

## Branch model + deploy

- **`main`** is deployable, and currently ships the **static** button (master switch off — see above). GitHub Pages auto-publishes via `.github/workflows/deploy-pages.yml` on every push.
- **`bet-slip-progression`** — snapshot of the full animated progression system (master switch on). Reference / restore point for the effects.
- Feature/exploration branches off `main`: `tier_4`, `odds-effect`, `explorations`, etc. These do NOT auto-deploy.
- Promote work to `main` via merge or by `git checkout <sha> -- <files>` from the feature branch (handy when you want some files but not others — e.g., merge T4 minus the shake).
- **`vite.config.ts`** has `base: '/one-click-bet/'` for the Pages subpath. Don't remove it.

## Working-style defaults (carry across chats)

- **Always ask clarifying questions** in short polls (`AskUserQuestion`) before coding when the request is ambiguous — never guess. Especially for: tier scope (T-only vs additive), color choices, threshold numbers, intensity tradeoffs.
- **Be concise.** Iterate on small tuning changes; users typically expect multiple rounds of refinement (slower / dimmer / further / etc.).
- **Save checkpoints with git tags** before risky changes (e.g., `pre-stroke-thin-t3`, `pre-attracted-sparks`). User explicitly says "save this version" when they want one.
- **Never reinterpret, invent, or recreate icons / SVGs / PNGs / images.** Wait for the user to upload the asset file and tell you which to use. If a component needs visual assets that aren't yet provided, ASK — don't substitute placeholder shapes, emojis, or paths drawn from imagination. The current uploaded asset set lives in `src/assets/`.

## Common gotchas

- **`tier === N` vs `tier >= N`** — new tiers don't inherit T3-only effects unless you change `===` to `>=`. Audit every gate when adding a tier (OddsRipple, fire sparks, outline ripple, tremor, glow loop, etc.).
- **`getComputedStyle().opacity`** can return stale values during framer-motion animations. Use `getBoundingClientRect` or `element.getAnimations()` to verify motion in evals.
- **`shellSize.w === 0`** on first render before the `ResizeObserver` fires. Gate any size-dependent SVG with `shellSize.w > 0`.
- **CSS `offset-path: inset(0 round Npx)` ⚠️ Safari 16+.** The OddsRipple uses this. If you target older browsers, fall back to keyframe-based motion.
- **`shellRef`/`shellSize` only used by the SVG stroke sweep.** Don't accidentally remove them or the sweep breaks at runtime.

## For Flutter engineers (this repo is a POC for a Flutter mobile feature)

The React/Framer Motion code here is **not a direct translation source** — DOM/CSS and Flutter render very differently. But the repo IS a high-fidelity spec.

**Read in this order:**
1. The live site at `?debug=true` — visual ground truth, with jump-to-tier buttons and 3× slow-mo.
2. **`EFFECTS.md`** — plain-English feature spec, grouped by tier.
3. **`src/buttonProgressionConfig.ts`** — every magic number documented. **Copy values verbatim into Dart.**
4. **`FLUTTER_PORTING.md`** at the repo root — API mapping table (Framer Motion → AnimationController, conic-gradient → CustomPainter, etc.) + per-effect porting notes + branch reference.
5. The TS code only as a reference for *when* things fire and the relationships between effects.

Key design principle to preserve: **no base color shifts across tiers** — escalation comes from motion, light, and behavior.

## Where to start a new exploration

1. Branch from `main`: `git checkout -b feature/whatever`.
2. Make changes (touching `EFFECTS.md` in the same commit).
3. Verify locally at `http://localhost:5174/one-click-bet/?debug=true` — use the debug tier buttons to skip ahead.
4. When ready, merge or cherry-pick to `main` → auto-deploys in ~30s.
5. Tag with `git tag -a <name> -m "..."` before destructive changes.

## Recent landmarks (rolling — keep current)

- **Repo forked to "One Click Bet"** from `draftea-momios-prototype` as a base for new explorations. Original untouched.
- **`BetSlipSheet` liquid-glass morph** — the collapsed pill ↔ expanded card is now ONE persistent glass surface that morphs its *shape* (height + corner radius, bottom-anchored via `collapseP`) so it never fades to an empty frame. Card content fades out early; the real `ButtonPreviewMomios` pill fades in only over the last stretch, onto the identical capsule the surface has become (seamless hand-off). The collapse is **gesture-driven**: dragging down continuously shrinks the surface with the finger (top edge tracks it, bottom stays anchored 8px above the navbar). Swipe **up** opens the full-screen `BetSlipFullSheet`; swipe **down** or 10s inactivity collapses; tap re-expands. Subtle squash-&-stretch pulses on appear + collapse (`ENTRY_PULSE_*` / `COLLAPSE_PULSE_*`).
- **Swipe-to-confirm gate + loader** — the thumb only confirms when it reaches the **end of the track** (measured from the track/thumb widths, not a fixed px). On completion it pins and shows a spinner for `CONFIRM_LOADER_MS` (900ms, simulated ticket creation) before the success flow. Same in `BetSlipFullSheet`.
- **Success overlay redesign** (`EntryCreatedOverlay`) — the green card now enters via a **circular clip-path reveal** (`greenCircleIn`, 0.2s) with the check/text popping in; when the reveal completes it fires a **green spark burst** + a **squash/stretch "pop"** + **glow flash**, then a faster genie flight (no anticipation phase) that **fades out ~3px before the tab** so it never overlaps. The slip stays mounted until `onCovered` (no gap behind the reveal).
- **Lightning Straight Bet** — long-press (450ms) any pick to create an entry **instantly**, skipping the slip entirely (only the success animation + post-entry actions play). The pressed pick first shows its **selected state** (the pick is added, slip suppressed via the `lightning` flag), then the entry is created a beat later (`LIGHTNING_SELECT_MS`). `useLongPress` in `HomeScreen.tsx`; `lightningBet(id)` in `App.tsx`.
- **Lightning success = ticket variant** — for lightning bets ONLY, the success component is a smaller **ticket/stub** (Figma 33605:90122): 220×140, rounded corners + a semicircular notch on the mid-left/right edges (CSS `mask`), a light-green stroke + green glow via a wrapper `drop-shadow` (a box-shadow would be clipped by the mask), sitting 12px above the navbar. All animations + the message are unchanged; normal swipe-confirm entries keep the full rounded card. Passed via the `lightning` prop to `EntryCreatedOverlay`; `cfg.ticket` holds the geometry.
- **Sticky/collapsing header** (`HomeScreenChrome`) — two-tier CSS sticky: the topbar (status + logo/balance, with the top glow) pins at `top:0`; the match tabs + pill markets pin just below it (offset = measured topbar height); the league tabs sit between in normal flow and scroll away/hide under the topbar. No scroll listener.
- **Mobile collapse fixes** — `overscroll-behavior-y: none` on html/body kills pull-to-refresh on the collapse swipe; `touch-action: none` on the expanded slip (added because the collapse drag uses `dragControls`/`dragListener=false`, so Framer doesn't auto-apply it) lets the downward drag grab instead of the browser scrolling.
- **Entry-count badge + post-entry action buttons** (Figma "navbarFooter" 33563:154460) — badge restyled to the "Entry counter": `#3d3d3d` pill, 2px `#191919` ring, bold white count at the icon's top-right; squash-stretch pop on appear (CSS `badgePop`, keyed per entry) + fade-out. Action row = 44px circular reuse/share/discard buttons (`#191919` fill, `rgba(251,251,251,0.16)` border), 12px above the navbar, fade in/out. **Badge and buttons share ONE 5s timer and disappear together.**
- **Backup branch `betslip-morph-v1`** — snapshot of the pre-liquid-glass (cross-fade) morph iteration.
- **Progression animations switched OFF on `main`** via the `cfg.animationsEnabled` master switch (see section above). The animated version is preserved on the `bet-slip-progression` branch. New "One Click Bet" explorations build on the static baseline.
- **T4 "Legendario" tier** added (≥ 50x). On `main`: boosted outer glow, white drop-shadow on all four numbers, denser edge-flash sparkles, faster + denser fire-sparks, more pronounced breath (amplitude 0.020 / 2200ms). Shake intentionally **excluded** on `main` (stays parked on `tier_4` branch).
- **OddsRipple** (`src/OddsRipple.tsx`) — T3+ ghost-text ripple on every selection add; pairs with a synchronized white drop-shadow flash on the source.
- **Italic typography at T3+** — the four bet-slip numbers switch to Red Hat Display Black Italic (matches Figma "Buscador" component).
- **Two parked exploration branches:** `odds-effect` (fire-sparks inflow direction — attracted from all sides), `explorations` (Magic UI shimmer-border via conic-gradient).

---

*If something significant about this project changes — architecture, file purposes, branch model, conventions, gotchas — update this file in the same commit.*
