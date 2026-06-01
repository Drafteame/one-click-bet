# Effects catalog — buttonPreviewMomios

A running list of every animation, microinteraction, and motion behavior in the prototype. Grouped by tier (each tier is **additive** on top of the lower tiers) plus the cross-cutting categories at the bottom.

> Keep this file in sync. Whenever an effect is added, removed, retuned, or moved between tiers, update the relevant section here in the same commit.

---

## T0 — Default *(odds < 2.00x)*

- **Slot-style per-digit counter** — selection count and odds animate per-character; digits that change unmount/remount, static glyphs stay put.
- **Press feedback** — scale 0.97 on press, spring back on release.
- **Anticipation compress** — 0.99 scale, 40ms, before each slot roll (gives digit motion physical weight).
- **Settle overshoot** — digit lands at 1.04 scale and settles back *(microinteraction d)*.
- **Recoil** — slip pushed down 4px on every selection add/remove, springs back (slightly bouncy).
- **Center radial burst on add** — a white ring radiates from the button center on every selection add. Active at T0/T1/T2. *Suppressed at T3* (the OddsRipple + outline ripple together cover the on-add feedback there, and the center ring was competing with them.)
- Static 1px `#4b20ff` border, flat `#191919` background, `#4b20ff → #9730ff` Gana CTA gradient.

## T1 — *Intermedio* *(≥ 2.00x)*

- **Ambient breathing** — slow inhale/exhale, 4000ms period, amplitude 0.008 *(microinteraction e)*.
- **Count badge pulse** — text-shadow flash on the Bets number whenever `selectionCount` changes.
- **Edge-flash sparkles** — 1–2 per burst, every 8000ms.

## T2 — *Súper* *(≥ 5.00x)*

- **Background crossfade** to the purple gradient (`#14083d → #230c3e → #5224f1`) — 500ms ease at the T1↔T2 boundary *(smoothed)*.
- **Gana CTA upgrade** — gradient end shifts to `#a954ff`, adds `drop-shadow(0 2px 6px rgba(29,11,68,0.3))`.
- **Outer glow** — diffuse blurred sibling element, Apple Intelligence–style conic-gradient swirl (`#4E7BFF` + `#9730FF`, 7s); opacity breathes between 0.18 and 0.26.
- **Glow flash on odds update** — +40% boost for the flash duration.
- **Border stroke shine sweep** — SVG `linearGradient` traveling L→R along the 1px border, peak `#dcb0ff`, 2.8s cycle, 2.5px stroke @ ~30% opacity.
- **Faster breathing** — 3000ms period.
- **More frequent sparkles** — 1–3, every 5500ms.
- **Lerp-smoothed glow opacity** — 250ms half-life when entering/leaving T2 *(smoothed)*.
- **Outline ripple** — on every selection ADD, a ghost border expands outward from the button outline and fades. Stacks up to a few simultaneous ripples on rapid adds. Inherited at T3.

## T3 — *Máximo* *(≥ 15.00x)*

- **Italic typography** — the four numbers (Bets, Momio, Monto, Gana) switch to Red Hat Display **Black Italic** (matches the Figma "Buscador" component).
- **Fire-shimmer per-character brightness wave** — vertical white-band gradient on each glyph (Momio + Gana), L→R stagger via `--ci` CSS var (2s cycle).
- **Gana glow filter** — layered `drop-shadow()` halo on the Gana digits that breathes with the odds value. *(Momio's purple halo was removed — the new OddsRipple + synchronized white flash carry the glow there instead.)*
- **Glow intensifies** — opacity range 0.36–0.50 (was 0.18–0.26 at T2), faster pulse (4.8s).
- **Fire-spark emitter** — rising purple embers spawn at the top edge of the button, drift up ~22–48px, fade out (continuous, capped at 20 active).
- **Micro-tremor** — burst-and-quiet (not continuous sine): brief jitter every `cycleMs`, quiet between.
- **Even faster breathing** — 2000ms period.
- **Most sparkles** — 2–4 per burst, every 4500ms.
- **Border stroke sweep brightens but thins** — same sweep as T2, now at full opacity but reduced to a 1.5px stroke so its visual weight matches T2's dimmer 2.5px stroke (T3 reads as more intense without reading as fatter).
- **Odds ripple** — on every selection ADD, a ghost copy of the Momio digits scales outward (~1.5×) and fades over 900ms, white with a soft white glow (text-shadow). Pairs with a synchronized white drop-shadow flash on the source digits (300ms ease-out) so the source briefly brightens as the ghost emanates outward. Stacks up to 3 simultaneous ripples on rapid adds.

---

## Tier-crossing flourishes *(one-shot)*

- **Up-cross** — radial bloom at center, collision flash at bottom-center, one floating sparkle, scale pulse, border-glow surge.
- **Down-cross** — quick down-sweep.

## Bet-slip lifecycle

- **Bouncy entry** on first mount (`BetSlipShell` wrapper).
- **Velocity-derived landing squash** when entering.
- **AnimatePresence** with `mode="wait"` and a reserved 88px slot so the navbar doesn't shift on enter/leave.
- **Springy recoil** queued on re-adds after the first.

## Accessibility

- `prefers-reduced-motion` disables tremor, shimmer, sparks, and all CSS keyframes.
- All ambient effects throttleable via `?debug=true` overlay (speedScale 1× or 3×, T3 odds effect: flames / smoke).
