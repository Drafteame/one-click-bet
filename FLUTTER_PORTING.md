# Porting this prototype to Flutter

This repo is the **visual + behavioral spec** for a Flutter mobile app feature. The code here (React + Framer Motion + Tailwind) is NOT a translation source — Flutter and React render very differently. But the prototype is highly useful as a spec.

## How to use this repo if you're porting to Flutter

**Read in this order:**

1. **The live site** — https://drafteame.github.io/draftea-momios-prototype/ — open with `?debug=true` to jump between tiers and slow to 3× for inspecting motion. This is the visual ground truth.
2. **[`EFFECTS.md`](./EFFECTS.md)** — plain-English catalog of every animation/microinteraction, grouped by tier. This is your feature spec.
3. **[`src/buttonProgressionConfig.ts`](./src/buttonProgressionConfig.ts)** — every magic number (durations, amplitudes, opacities, easing curves, tier thresholds) lives here with a comment. **Copy these values verbatim** into Dart — they're tuned, not arbitrary.
4. **This file** — translation hints + gotchas (below).
5. **The TS code** — last. Use it only as a reference for *when* things fire and the relationships between effects, not as a source for how to implement.

## Direct value translations (copy verbatim)

| TypeScript | Dart / Flutter |
|---|---|
| `cfg.tiers[*].minOdds` | const `const tierThresholds = [0, 2.0, 5.0, 15.0, 50.0];` |
| Easing `[0.16, 1, 0.3, 1]` | `Cubic(0.16, 1.0, 0.3, 1.0)` |
| Easing `'easeOut'` | `Curves.easeOut` |
| Easing `'easeIn'` | `Curves.easeIn` |
| `duration: 1200ms` | `Duration(milliseconds: 1200)` |
| Opacity keyframes `[0, 1, 1, 0]` with times `[0, 0.05, 0.97, 1]` | `TweenSequence` with `weight:` proportional to `Δtime` |
| Spring `{ stiffness, damping, mass }` (recoil) | `SpringSimulation(SpringDescription(stiffness: ..., damping: ..., mass: ...))` |

## API mapping

| This repo uses | Flutter equivalent |
|---|---|
| Framer Motion `useMotionValue` / `useSpring` / `useTransform` | `AnimationController` + `Tween` + `Animation.drive(CurveTween)` |
| `useAnimationFrame((t) => ...)` (custom per-frame ticker) | `Ticker` (raw) or `AnimationController` with `addListener` |
| `AnimatePresence` mount/unmount | `AnimatedSwitcher`, `AnimatedSize`, or manual `AnimationController` w/ disposal in a `StatefulWidget` |
| CSS `conic-gradient` + `@property --angle` (the outer-glow swirl) | `CustomPainter` with `SweepGradient` and an `AnimationController` rotating the start angle |
| CSS `background-clip: text` (fire-shimmer wave) | `ShaderMask` widget wrapping a `Text`, with a `LinearGradient` whose offset animates |
| CSS `mask-composite: exclude` (Magic UI border ring, parked on `explorations`) | `CustomPainter` with `Path.combine(PathOperation.difference, outer, inner)` or `ClipPath` |
| CSS `offset-path: inset(0 round Npx)` (orbital spark on Magic UI shimmer) | Hand-roll the rounded-rect perimeter math in a `CustomPainter`; advance a parametric `t` ∈ [0,1] |
| `filter: drop-shadow(...)` motion value | `BoxShadow` list on a container, or `ImageFiltered` with `ImageFilter.blur` for filter-style halos |
| DOM z-stacking via `position: absolute; inset: 0` | `Stack` + `Positioned.fill` |
| SVG `<rect stroke="url(#gradient)" />` (stroke shine sweep) | `CustomPainter` drawing the rounded-rect stroke with a `Paint..shader = LinearGradient.createShader(...)` whose origin animates |

## Per-effect porting notes

Numbers below all live in `buttonProgressionConfig.ts` — read there for the canonical tuning.

### Slot-style per-digit counter (`SlotNumber.tsx`)

Split the value string into characters; for digits that change between renders, slide the old digit up + out while the new one slides in from below. In Flutter: `Row` of per-character widgets, each wrapping its current digit in an `AnimatedSwitcher` keyed by the digit value, with `SlideTransition` as the `transitionBuilder`. Non-digits (`.`, `x`, `$`) skip animation. Stagger via per-character `Animation`s if you want a cascade.

### Press feedback + anticipation + settle overshoot + recoil

Four small spring/tween moments on the slip wrapper. In Flutter: one `AnimationController` per behavior, composed into a single `Transform` via `Listenable.merge([...])` in an `AnimatedBuilder`. The recoil spring is the most complex — use a `SpringSimulation` with stiffness 260, damping 14, mass 0.7 (see config).

### Ambient breathing (T1+, period scales per tier)

Single `AnimationController` with infinite repeat. `Transform.scale` driven by `1 + amplitude * sin(2π * controller.value)`. Per-tier period and (at T4) amplitude live in `cfg.breath.periodByTier` / `cfg.breath.amplitudeByTier`.

### Outer glow (conic swirl, T2+)

The hardest visual. In React: a blurred sibling `div` with a CSS conic-gradient and an animated angle via `@property`. In Flutter: a `CustomPainter` drawing the slip's pill shape with a `SweepGradient` shader, then wrapping the whole painter in `ImageFiltered(imageFilter: ImageFilter.blur(sigmaX: 20, sigmaY: 20))`. Rotate the gradient's start angle with an `AnimationController` (7s cycle in this repo). Mask the result with a soft radial ellipse so the glow falls off at the top/bottom — Flutter's `ShaderMask` over the blurred layer.

### Border stroke shine sweep (T2+)

A linear-gradient stripe that travels around the rounded-rect border. The Magic UI variant (parked on `explorations`) uses a conic wedge + mask-composite for a true around-the-perimeter orbit. **The mainline (and `main` branch) uses a simpler L→R sweep along a horizontal stripe.** For Flutter:
- Simple horizontal sweep → `CustomPainter` with a `LinearGradient` shader whose `start`/`end` translate along x.
- Around-the-perimeter orbit → parametric `t` ∈ [0,1] mapped to a point on the pill perimeter, draw a small spark there.

### Fire-shimmer per-character brightness wave (T3+, Gana + Momio)

For each character, a vertical lavender→white→lavender gradient sweeps top-to-bottom over 2s, staggered by 150ms × character index. In Flutter: per-character `ShaderMask` widget wrapping the `Text` with a `LinearGradient` whose offset animates. Stagger each character's controller by `i * 150ms`. There's also a `.fire-shimmer-gold` variant (white text + gold band) parked unused in CSS — same mechanic, different gradient.

### OddsRipple (T3+, ghost-text ripple on every selection add)

When a selection is added, render a ghost copy of the Momio digits at the same position with `transformOrigin: center`. Animate `scale: 1 → 1.5` and `opacity: 0.95 → 0` over 1200ms with curve `(0.16, 1, 0.3, 1)`. The source digits get a synchronized 300ms ease-out white drop-shadow flash. Stacks up to 3 simultaneous ripples on rapid adds. Snapshots the odds string at spawn so the ghost doesn't morph mid-animation.

In Flutter: `Stack` containing the real `Text` and a list of ghost `Positioned.fill` overlays. Each ghost is its own `StatefulWidget` with an `AnimationController` (1200ms). Composite `ScaleTransition` + `FadeTransition`. Source flash via a separate controller animating a `BoxShadow` opacity.

### OutlineRipple (T2+, ghost border on every add)

Similar to OddsRipple but the ghost is the **button outline**, not text. Same 600ms duration, scale `1.18` peak, easing `(0.16, 1, 0.3, 1)`. Stacks up to 3.

In Flutter: `Stack` overlay with a `Container` whose `border` (or `OutlinedBorder`) animates from full opacity to transparent while scaling outward. Use `Transform.scale` over a `DecoratedBox`.

### Fire-spark emitter (T3+, rising purple embers)

Particles spawn every 220ms (T3) or 130ms (T4), 1–2 per spawn (T3) or 2–3 (T4), each a small vertical streak (size × 5 height) with a purple linear-gradient (transparent → solid `#9730ff` at top). They rise straight up `riseMin..riseMax`px while fading. Lifetime 800–1400ms (T3) or 500–900ms (T4). Capped at 20 or 32 active. Note: the `odds-effect` branch has a parked **inflow** variant (sparks attracted FROM all directions instead).

In Flutter: a `StatefulWidget` maintaining a `List<_Spark>` state. A periodic `Timer.periodic` adds new particles; each particle has its own short-lived `AnimationController` or computes its progress against `spawnTime` in a single global `AnimationController`. Render each as a `Positioned` with a `LinearGradient`-painted container + `ImageFiltered` for the glow. Garbage-collect on lifetime end.

### Tier-crossing flourishes (one-shot, on `prev_tier → new_tier`)

Up-cross: radial bloom from center, collision flash, floating sparkle, scale pulse, border-glow surge. Down-cross: quick down-sweep. Driven by a state hook that detects tier change and renders/unmounts a short-lived overlay.

In Flutter: detect tier change in `didUpdateWidget` of a `StatefulWidget`. Push a short-lived overlay (key by a crossing-id) that runs an `AnimationController` once and removes itself.

### Tier-paced tremor (T3 only)

A burst-and-quiet pattern: tremor is active for `tremorBurstMs` (220ms) every `tremorCycleMs` (1500ms), so quiet between. Amplitude 0.3px, frequency 12Hz, x/y noise via two phase-offset sines with a fade-in/out envelope.

In Flutter: continuous `Ticker` (`SchedulerBinding.instance.scheduleFrameCallback`). Each frame computes `phase = t % cycleMs`; if `phase > burstMs` apply zero offset; otherwise apply `sin(t * 2π * Hz / 1000) * amp * envelope`. Apply the result as a `Transform.translate` on the slip wrapper.

T4 on the parked `tier_4` branch turns this into a continuous (non-burst) shake. **`main` keeps T4 shake-free.**

### Background crossfade at T1↔T2

The slip's flat `#191919` background crossfades to a purple gradient at the T1→T2 boundary over 500ms ease-out. The shell keeps `#191919` as a base; an overlay `div` with the gradient animates its opacity.

In Flutter: `Stack` of two `Container`s (one flat, one gradient). `AnimatedOpacity` on the gradient layer driven by `tier >= 2`.

### Italic typography switch at T3+

The four bet-slip numbers (Bets, Momio, Monto, Gana) switch from `Red Hat Display Regular 900` to `Red Hat Display Black Italic 900` at T3+. Pre-load the italic font (loaded via Google Fonts in the prototype). In Flutter: load both styles via `pubspec.yaml` and toggle `TextStyle.fontStyle: tier >= 3 ? FontStyle.italic : FontStyle.normal`.

## Gotchas + tips

- **Reduced motion**: respect `MediaQuery.disableAnimations` everywhere — disable particle emitters, swirls, shimmers, tremor. The React code uses `prefers-reduced-motion`; mirror that.
- **Tier gating idiom**: this repo uses both `tier === N` (exclusive) and `tier >= N` (additive). Audit every gate when extending — Effects.md notes which apply where.
- **`vsync`**: most `AnimationController`s need a `TickerProvider`. Use `SingleTickerProviderStateMixin` for one, `TickerProviderStateMixin` for many.
- **GC discipline**: dispose every `AnimationController` in `dispose()`. The React equivalent is the `useEffect` cleanup return.
- **Color philosophy**: do NOT vary base colors across tiers. Effects come from motion, light, and behavior. This is a Draftea design principle — the prototype enforces it.
- **Tunability**: keep equivalent of `buttonProgressionConfig.ts` as a single Dart file (`button_progression_config.dart`) so the design team can dial values without code spelunking.

## Useful Flutter packages

- `flutter_animate` — concise builder API for chained sequences (`.fadeIn().slideY()`). Useful for the simpler ambient stuff.
- `rive` — if you want to author the swirl/glow as a designer-driven state machine instead of code. Worth considering for the outer glow.
- `confetti` or `particles_flutter` — drop-in for the spark emitter if you don't want to hand-roll it.
- Stick with Flutter's built-in `CustomPainter` + `AnimationController` for anything Apple-Intelligence-grade — third-party libs hit a ceiling.

## Branch reference for the porter

| Branch | What's there | Worth porting? |
|---|---|---|
| `main` | Production-shape: T0–T4 with the current OddsRipple + outline ripple + tier 4 set (no shake) | ✅ Yes — this is the deployable spec |
| `explorations` | Magic UI shimmer-border (CSS mask-composite trick) | Reference-only; the Flutter equivalent is a `CustomPainter` |
| `odds-effect` | Fire-spark **inflow** variant (sparks attracted from all sides) + dim ripple iterations | Optional alternate direction if you want a different feel |
| `tier_4` | Earlier T4 work including the continuous shake (excluded from main) | Reference for the shake math if you re-enable it |

Tags worth knowing: `pre-stroke-thin-t3`, `pre-attracted-sparks` — checkpoints before risky changes. Use them as a way to compare visual deltas.
