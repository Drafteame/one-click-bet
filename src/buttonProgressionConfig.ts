import type { TierConfig } from './types';

/**
 * Central tunable configuration for the buttonPreviewMomios progression.
 * Every "magic number" used by the animated button lives here with a comment.
 *
 * Rule of thumb: if a tier feels weak, do NOT crank up an existing effect's
 * intensity — add a NEW layer. Each individual effect must stay restrained.
 */
export const buttonProgressionConfig = {
  /* --------------------------------------------------------------- */
  /*  TIER THRESHOLDS — driven by cumulative odds                    */
  /* --------------------------------------------------------------- */
  tiers: [
    { id: 0, name: 'Default', minOdds: 0 },
    { id: 1, name: 'Intermedio', minOdds: 2.0 },
    { id: 2, name: 'Súper', minOdds: 5.0 },
    { id: 3, name: 'Máximo', minOdds: 15.0 },
  ] as TierConfig[],

  /* --------------------------------------------------------------- */
  /*  GLOBAL                                                          */
  /* --------------------------------------------------------------- */
  // Cap selections at this count to prevent runaway tiers.
  maxSelections: 8,
  // Press feedback — scale on press, spring back on release (all tiers).
  pressScale: 0.97,
  // Slot animation duration for per-digit roll (selection count + odds).
  slotDurationMs: 380,
  // Anticipation compress before slot roll: gives digit motion physical weight.
  anticipationScale: 0.99,
  anticipationDurationMs: 40,
  // Microinteraction (d) — overshoot when a digit lands after slot.
  settleOvershootScale: 1.04,
  settleOvershootDurationMs: 120,
  // EXPLORATION — recoil: the whole slip gets pushed DOWN a little on
  // every selection add/remove, then springs back to its rest position.
  // Fires on changes while showing (not on the initial 0→1 mount).
  recoil: {
    pushDownPx: 4, // subtler shove (was 6)
    // Spring back to 0 — softer + slower + clearly underdamped so it
    // bounces a couple of times before settling (springy feel).
    // Lower stiffness = slower; lower damping ratio = more bounce.
    spring: { stiffness: 260, damping: 14, mass: 0.7 },
  },
  // Geometry — radius of the rounded-pill border (matches Figma 56/2).
  borderRadiusPx: 28,
  borderHeightPx: 56,
  // Reserved vertical space the bet slip occupies (px). Used to keep the
  // navbar pinned when the slip unmounts at 0 selections.
  slotReservedHeightPx: 88,

  /* --------------------------------------------------------------- */
  /*  EXPLORATION — Sparkles + fire sparks                           */
  /* --------------------------------------------------------------- */
  // Edge-flash sparkles now appear at T1+, with density rising per tier.
  // (Previously T3-only at 4500ms/2-4 count.)
  sparkles: {
    byTier: {
      1: { intervalMs: 8000, countMin: 1, countMax: 2 },
      2: { intervalMs: 5500, countMin: 1, countMax: 3 },
      3: { intervalMs: 4500, countMin: 2, countMax: 4 },
    } as Record<number, { intervalMs: number; countMin: number; countMax: number }>,
    durationMs: 700, // lifetime of each flash (carried over from tier3.sparkleDurationMs)
  },
  // T3 only — rising "fire sparks" emitted from the TOP of the button
  // that float upward past the button while fading. Continuous emission.
  // Spawn position is at/near the top edge so the visible flight happens
  // OUTSIDE the button rather than within it.
  fireSparks: {
    spawnIntervalMs: 220, // new particle every ~220ms
    spawnCountMin: 1,
    spawnCountMax: 2,
    // Rise distance (px upward). Kept short so embers stay CLOSE to the
    // button — like sparks just above a flame, not a tall fountain.
    riseMinPx: 22,
    riseMaxPx: 48,
    // Horizontal drift/sway range (px, ±) — subtle wander.
    driftMaxPx: 12,
    // Particle size range (px).
    sizeMinPx: 2,
    sizeMaxPx: 3.5,
    // Lifetime range (ms) — shorter so embers fade quickly without
    // drifting far from the source.
    lifetimeMinMs: 800,
    lifetimeMaxMs: 1400,
    // Cap simultaneous active particles to prevent buildup.
    maxActive: 20,
    // Spawn origin Y as percentage FROM THE BOTTOM of the button.
    // [0.85, 1.05] = at or just above the top edge — sparks visibly emerge
    // from the top of the "fire" and rise into the air just above.
    spawnOriginYRangePct: [0.85, 1.05] as [number, number],
  },

  /* --------------------------------------------------------------- */
  /*  PASS 3 — Tier 3 odds effect (flames | smoke)                   */
  /*  The heat-haze duplicate-text layer is REMOVED in this pass.    */
  /*  Default is flames; runtime-togglable in ?debug=true overlay.   */
  /* --------------------------------------------------------------- */
  tier3OddsEffect: 'flames' as 'flames' | 'smoke',
  flames: {
    // Four layered text-shadow halos around the glyph edges. Each entry
    // is [blurRadiusPx, baseOpacity]. All stay inside the existing purple
    // accent — same hue, varying intensity. No new accent colors.
    layers: [
      [4, 0.8], // inner
      [10, 0.6], // mid
      [20, 0.35], // outer
      [32, 0.18], // far
    ] as Array<[number, number]>,
    // Synchronized slow pulse on all four layers (±30% around base).
    pulseDurationMs: 2000,
    pulseAmplitude: 0.3,
    // Fifth fast flicker layer — small blur, brightness oscillates 30–70%.
    flickerBlurPx: 6,
    flickerOpacityMin: 0.3,
    flickerOpacityMax: 0.7,
    // Deterministic sum-of-sines (3 components) for the flicker — feels
    // random but is reproducible and pausable for reduced-motion.
    flickerSines: [
      { freqHz: 8.3, weight: 0.45 },
      { freqHz: 13.7, weight: 0.35 },
      { freqHz: 19.1, weight: 0.2 },
    ],
  },
  smoke: {
    // How often a new blob spawns (ms).
    spawnIntervalMs: 350,
    // Blob lifetime range — randomized per spawn.
    lifetimeMinMs: 1800,
    lifetimeMaxMs: 2400,
    // Blob initial size range (px).
    sizeMinPx: 8,
    sizeMaxPx: 14,
    // Opacity at peak (during early life). Stays bright purple — no gray.
    opacityMinPeak: 0.08,
    opacityMaxPeak: 0.15,
    // Vertical translate (negative Y = upward).
    riseMinPx: 30,
    riseMaxPx: 50,
    // Scale grows over life (1 → 1.6 by spec).
    scaleEnd: 1.6,
    // Blur applied to the smoke LAYER (never to text).
    layerBlurPx: 3,
    // Cap simultaneous active blobs.
    maxBlobs: 12,
  },
  // Border light: a single traveling head rendered as TWO stacked stroke
  // layers (sharp core + wider soft halo) sharing one dashoffset. This is
  // not two heads — it's one head with a "core + bloom" structure that
  // makes the light read as glow rather than a drawn line.
  borderLight: {
    // Approved purple — used ONLY for the border-light effect.
    color: '#9730ff',
    // Sharp inner core: thicker than the original 2px (50% increase).
    coreStrokeWidthPx: 3,
    coreBlurStdDev: 2.5,
    // Wider, more diffuse outer halo at 50% of the core opacity.
    haloStrokeWidthPx: 4,
    haloBlurStdDev: 6,
    haloOpacityRatio: 0.5,
  },

  /* --------------------------------------------------------------- */
  /*  AMBIENT BREATHING (all tiers ≥ 1)                              */
  /*  Microinteraction (e): rate scales with tier.                   */
  /* --------------------------------------------------------------- */
  breath: {
    // Soft inhale/exhale — 1.000 → 1.008 → 1.000.
    amplitude: 0.008,
    // Period in ms per tier. Picked: T1 calm, T2 quicker, T3 quicker still.
    periodByTier: {
      1: 4000,
      2: 3000,
      3: 2000,
    } as Record<number, number>,
  },

  /* --------------------------------------------------------------- */
  /*  TIER 1 — Intermedio                                            */
  /* --------------------------------------------------------------- */
  tier1: {
    // Full loop of border light dash around the perimeter (slow at this tier).
    borderSweepDurationMs: 4500,
    // Visible portion of the loop (rest is quiet pause). 0..1.
    borderSweepActiveRatio: 0.35,
    borderSweepOpacity: 0.3,
    // Length of the lit dash segment (px along the stroke path).
    borderDashLengthPx: 26,
    // Odds typography breathing pulse loop (independent of button breath).
    oddsPulseDurationMs: 3000,
    oddsPulseScaleMax: 1.02,
    oddsPulseOpacityMin: 0.92,
    // Count badge pulse when the selection count value changes.
    countPulseScaleMax: 1.08,
    countPulseDurationMs: 220,
    countPulseGlowColor: 'rgba(151,48,255,0.7)', // existing accent
  },

  /* --------------------------------------------------------------- */
  /*  TIER 2 — Súper                                                 */
  /* --------------------------------------------------------------- */
  tier2: {
    borderSweepDurationMs: 2500,
    borderSweepActiveRatio: 0.65,
    borderSweepOpacity: 0.55,
    borderDashLengthPx: 34,
    // Soft outer glow using existing button palette.
    glowBlurPx: 22,
    glowOpacityMax: 0.26,
    glowOpacityMin: 0.18, // floor raised so it doesn't dim too far
    // Slower, gentler breathing.
    glowPulseDurationMs: 6000,
    // EXPLORATION — stroke shine sweep now appears at T2 too, but dimmer
    // and slower than T3 (a subtle "hint" of the T3 effect).
    strokeSweepDurationMs: 2800, // slower glide than T3's 2000ms
    strokeSweepOpacityFactor: 0.3, // ~30% of T3 brightness
    // +40% glow flash when odds update.
    glowFlashBoost: 0.4,
    glowFlashDurationMs: 300,
    // Inner highlight rim — out of phase with outer glow.
    // POLISH PASS — phase offset doubled (600 → 1200ms) to preserve the
    // out-of-phase relationship after the cycle slowdown.
    innerRimOpacityMax: 0.2,
    innerRimPhaseOffsetMs: 1200,
    innerRimBlurPx: 0,
    // One-step heavier font on the odds.
    oddsFontWeight: 800,
    oddsTextShadow: '0 0 6px rgba(151,48,255,0.45)',
    // Weight-gain anchor: one-shot when tier 2 is reached.
    weightAnchorTranslateYPx: 1,
    weightAnchorShadowMax: '0 2px 0 rgba(151,48,255,0.3)',
    weightAnchorDurationMs: 600,
    // Selection counter glow flash.
    counterUpdateGlowDurationMs: 700,
    // POLISH PASS — odds glow halo configuration.
    // Static text-shadow stack giving the digits a "lit from within" feel.
    oddsHaloStaticOpacity: 0.4,
    // Surge multiplier applied to halo opacity for 300ms when the odds change.
    oddsHaloUpdateBoost: 1.5,
    oddsHaloUpdateDurationMs: 300,
  },

  /* --------------------------------------------------------------- */
  /*  TIER 3 — Máximo                                                */
  /* --------------------------------------------------------------- */
  tier3: {
    // POLISH PASS — single head only (secondary head removed).
    // Cycle slightly faster (1800 → 1600) and opacity bumped (0.7 → 0.8)
    // to compensate for losing the second head.
    borderSweepDurationMs: 1600,
    borderSweepActiveRatio: 1.0,
    borderSweepOpacity: 0.8,
    borderDashLengthPx: 44,
    glowBlurPx: 28,
    glowOpacityMax: 0.5,
    glowOpacityMin: 0.36, // clearly brighter than T2 (0.18–0.26)
    // Slower, gentler breathing.
    glowPulseDurationMs: 4800,
    // Primary fire shimmer cycle on the odds text.
    fireSweepDurationMs: 2000,
    // Layered faster secondary shimmer — creates cross-flicker.
    fireSweepSecondaryDurationMs: 1200,
    // Heat-haze duplicate text layer.
    heatHazeBlurPx: 0.4,
    heatHazeOpacityMax: 0.3,
    heatHazePeriodMs: 1500,
    // Calmer intermittent tremor.
    tremorAmplitudePx: 0.3,
    tremorFrequencyHz: 12,
    // Intermittence envelope: tremor active for `burstMs` every `cycleMs`.
    tremorCycleMs: 1500,
    tremorBurstMs: 220,
    // Sparkle particles at long intervals (sparse).
    sparkleIntervalMs: 4500,
    sparkleDurationMs: 700,
    // On-add radial ring burst (the "you're cooking" moment).
    radialBurstDurationMs: 500,
    radialBurstStartPx: 1,
    radialBurstEndPx: 60,
    radialBurstOpacityStart: 0.5,
    // Magnetic pointer attraction — only at Tier 3.
    magneticRadiusPx: 60,
    magneticMaxTranslatePx: 3,
    magneticSpringStiffness: 280,
    magneticSpringDamping: 28,
    // POLISH PASS — odds glow at Tier 3.
    // The halo opacity breathes between min/max on this cycle.
    oddsHaloOpacityMin: 0.4,
    oddsHaloOpacityMax: 0.7,
    oddsHaloBreatheDurationMs: 2000,
    // Per-character brightness wave: every interval, a "shimmer" runs L→R
    // across each character, lasting `waveCharDurationMs` per char with a
    // `waveCharStaggerMs` lead between adjacent chars.
    oddsCharWaveIntervalMs: 3000,
    oddsCharWaveDurationMs: 120,
    oddsCharWaveStaggerMs: 60,
    oddsCharWaveBrightnessMax: 1.4,
    // Selection-add reward burst on the odds itself (in addition to the
    // settle overshoot): scale 1 → 1.08 over 300ms ease-out.
    oddsAddBurstScale: 1.08,
    oddsAddBurstDurationMs: 300,
    // POLISH PASS — outline ripple (NEW, distinct from center radial burst).
    // Button-shaped ghost border that expands outward from the button outline.
    // EXPLORATION — made "mainly brighter": higher start opacity + thicker
    // stroke, same 1.18 expansion size and 600ms timing.
    outlineRippleScalePeak: 1.18,
    outlineRippleStrokeStartPx: 3, // was 2
    outlineRippleStrokeEndPx: 1, // was 0.5 — stays visible longer as it thins
    outlineRippleOpacityStart: 0.85, // was 0.55
    outlineRippleDurationMs: 600,
    outlineRippleEase: [0.16, 1, 0.3, 1] as [number, number, number, number],
    // Cap simultaneous outline ripples; older ones drop off when exceeded.
    outlineRippleMaxStacked: 3,
    // Ganancia (potential winnings) gets the same odds-glow treatment
    // scaled down by this factor at Tier 3.
    ganaGlowScaleDown: 0.7,
  },

  /* --------------------------------------------------------------- */
  /*  TIER-CROSSING ONE-SHOTS                                        */
  /* --------------------------------------------------------------- */
  crossing: {
    // Up-cross: TWO light heads spawn from the top and travel in opposite
    // directions around the perimeter, meeting at the bottom.
    twoHeadDurationMs: 600,
    twoHeadDashLengthPx: 30,
    twoHeadOpacityPeak: 0.95,
    // Brief collision flash at the bottom of the button (300ms after spawn).
    collisionFlashDurationMs: 220,
    collisionFlashSizePx: 24,
    collisionFlashDelayMs: 300,
    // Up-cross scale pulse — bumpier spring for overshoot.
    upPulseScalePeak: 1.06,
    upPulseDurationMs: 450,
    upSpringStiffness: 320,
    upSpringDamping: 11,
    // Mandatory radial bloom from center on every up-cross.
    bloomDurationMs: 650,
    bloomScale: 1.6,
    bloomOpacityMax: 0.4,
    // One floating sparkle from the collision point.
    sparkleFloatDurationMs: 800,
    sparkleFloatRisePx: 18,
    // Down-cross — quieter inverse. Single dim reverse sweep, no scale, no sparkle.
    downSweepDurationMs: 700,
    downSweepOpacity: 0.4,
    downDashLengthPx: 22,
  },

  /* --------------------------------------------------------------- */
  /*  PASS 3 — ENTRY / EXIT animation (mount/unmount of the slip)    */
  /*  Fires when selections goes 0 → 1 (entry) or 1 → 0 (exit).       */
  /*  Bouncy entry fires ONLY on the very first mount of the session.*/
  /* --------------------------------------------------------------- */
  entry: {
    // REGRESSION FIX — clearer starting offset (80px below) + less-compressed
    // scale (0.85 not 0.3) per the new spec. Springs with intentionally low
    // damping to GUARANTEE a visible overshoot — the "bob" past endpoint.
    fromY: 80,
    fromScale: 0.85,
    fromOpacity: 0,
    toY: 0,
    toScale: 1,
    toOpacity: 1,
    // y spring — stiffness 380, damping 14, mass 1. Low damping → overshoot.
    ySpring: { stiffness: 380, damping: 14, mass: 1 },
    // scale spring — stiffness 300, damping 12, mass 1. Briefly oversizes
    // to ~1.05 before settling at 1.0.
    scaleSpring: { stiffness: 300, damping: 12, mass: 1 },
    // Fast opacity — button is visible from start of its rise.
    opacityDurationMs: 220,
  },
  exit: {
    toY: 30,
    toScale: 0.4,
    toOpacity: 0,
    // Sharp drop-off easing per the brief.
    ease: [0.7, 0, 0.84, 0] as [number, number, number, number],
    yScaleDurationMs: 280,
    opacityDurationMs: 200,
  },
  // Velocity-derived landing squash. As y velocity goes large negative
  // (button falling fast into place), scaleY compresses and scaleX
  // stretches. As velocity decays, squash returns to neutral.
  landingSquash: {
    velocityCenter: 0,
    velocityRange: 1500, // px/s
    // [largeNeg, 0, largePos] → [scaleY, scaleY, scaleY]
    scaleYRange: [0.94, 1, 1.02] as [number, number, number],
    scaleXRange: [1.04, 1, 0.98] as [number, number, number],
  },

  /* --------------------------------------------------------------- */
  /*  ACCESSIBILITY                                                  */
  /* --------------------------------------------------------------- */
  // When prefers-reduced-motion is set, only one-shot slot rolls survive,
  // and even those are compressed to this shorter duration.
  reducedMotionSlotDurationMs: 180,
} as const;

export type ButtonProgressionConfig = typeof buttonProgressionConfig;
