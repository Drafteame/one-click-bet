# CLAUDE.md — buttonPreviewMomios prototype

Project memory for any Claude session opened in this repo. Read first; **keep this file updated in the same commit as any change that meaningfully shifts architecture, conventions, branch model, or "where things live."**

---

## What this is

A high-fidelity interactive prototype of a **Draftea sportsbook bet-slip CTA** that escalates user engagement across 5 tiers (T0 → T4) using motion, light, and behavior — **not color shifts**. Built from Figma "Buscador" frames via the Figma MCP connector.

**Live preview:** https://drafteame.github.io/draftea-momios-prototype/
**Repo:** `Drafteame/draftea-momios-prototype` (private)
**Local path:** `~/sportsbook-prototype`

## Stack

- **Vite 5** + **React 18** + **TypeScript (strict)** + **Tailwind 3** + **Framer Motion 11**
- Build: `npm run build` (uses `vite build` only — `tsc` is intentionally **dropped** because pre-existing TS errors in `App.tsx`, `BetSlipShell.tsx` etc. would block CI. Run type-checking via `npm run typecheck` when you need it.)
- Dev: `npm run dev` → **http://localhost:5174/draftea-momios-prototype/** (note the subpath — root `/` 302-redirects there because of `base:` in `vite.config.ts`).

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
| `src/ButtonPreviewMomios.tsx` | Hero component (~1.7k LOC). All tier-gated effects live here. |
| `src/buttonProgressionConfig.ts` | **Central tunables.** Every magic number lives here with a comment. |
| `src/types.ts` | `Tier = 0 | 1 | 2 | 3 | 4`, `Selection`, `TierConfig`. |
| `src/App.tsx` | Top-level orchestration: selection state, debug overlay, `selectionsForTier(N)` helper. |
| `src/HomeScreen.tsx` | `MOCK_PICKS` array drives the pick cards. |
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

## Branch model + deploy

- **`main`** is deployable. GitHub Pages auto-publishes via `.github/workflows/deploy-pages.yml` on every push.
- Feature/exploration branches off `main`: `tier_4`, `odds-effect`, `explorations`, etc. These do NOT auto-deploy.
- Promote work to `main` via merge or by `git checkout <sha> -- <files>` from the feature branch (handy when you want some files but not others — e.g., merge T4 minus the shake).
- **`vite.config.ts`** has `base: '/draftea-momios-prototype/'` for the Pages subpath. Don't remove it.

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
3. Verify locally at `http://localhost:5174/draftea-momios-prototype/?debug=true` — use the debug tier buttons to skip ahead.
4. When ready, merge or cherry-pick to `main` → auto-deploys in ~30s.
5. Tag with `git tag -a <name> -m "..."` before destructive changes.

## Recent landmarks (rolling — keep current)

- **T4 "Legendario" tier** added (≥ 50x). On `main`: boosted outer glow, white drop-shadow on all four numbers, denser edge-flash sparkles, faster + denser fire-sparks, more pronounced breath (amplitude 0.020 / 2200ms). Shake intentionally **excluded** on `main` (stays parked on `tier_4` branch).
- **OddsRipple** (`src/OddsRipple.tsx`) — T3+ ghost-text ripple on every selection add; pairs with a synchronized white drop-shadow flash on the source.
- **Italic typography at T3+** — the four bet-slip numbers switch to Red Hat Display Black Italic (matches Figma "Buscador" component).
- **Two parked exploration branches:** `odds-effect` (fire-sparks inflow direction — attracted from all sides), `explorations` (Magic UI shimmer-border via conic-gradient).

---

*If something significant about this project changes — architecture, file purposes, branch model, conventions, gotchas — update this file in the same commit.*
