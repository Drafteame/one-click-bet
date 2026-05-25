import {
  AnimatePresence,
  motion,
  useAnimation,
  useAnimationFrame,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
} from 'framer-motion';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { BorderLight } from './BorderLight';
import { buttonProgressionConfig as cfg } from './buttonProgressionConfig';
import { OddsSmokeEffect } from './OddsEffects';
import { OutlineRipple } from './OutlineRipple';
import { playSound } from './playSound';
import { SlotNumber } from './SlotNumber';
import type { Tier } from './types';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/* =================================================================== */
/*  TIER DETECTION — pure function                                     */
/* =================================================================== */
export function tierForOdds(odds: number): Tier {
  for (let i = cfg.tiers.length - 1; i >= 0; i--) {
    if (odds >= cfg.tiers[i].minOdds) return cfg.tiers[i].id;
  }
  return 0;
}

/* =================================================================== */
/*  Helpers                                                            */
/* =================================================================== */
const formatOdds = (n: number) => `${n.toFixed(2)}x`;

type Sparkle = { id: number; x: number; y: number; size: number };

/* =================================================================== */
/*  Public live state — exposed for the debug overlay                  */
/* =================================================================== */
export type ButtonLiveState = {
  tier: Tier;
  cumulativeOdds: number;
  tremorActive: boolean;
  borderPhase: number; // 0..1 — primary sweep position
  breathPhase: number; // 0..1 — breathing cycle position
};

type Props = {
  selectionCount: number;
  cumulativeOdds: number;
  /** Multiplier to slow all ambient animations (debug overlay sets 3). */
  speedScale?: number;
  /** Callback fired whenever live ambient phase values change. */
  onLiveState?: (s: ButtonLiveState) => void;
  /** PASS 3 — Tier 3 odds effect variant. Default 'flames'. */
  tier3OddsEffect?: 'flames' | 'smoke';
};

export function ButtonPreviewMomios({
  selectionCount,
  cumulativeOdds,
  speedScale = 1,
  onLiveState,
  tier3OddsEffect = cfg.tier3OddsEffect,
}: Props) {
  const reduced = usePrefersReducedMotion();
  const tier = tierForOdds(cumulativeOdds);

  /* =============================================================== */
  /*  STATE — tier crossing detection (up vs down)                   */
  /* =============================================================== */
  const prevTierRef = useRef<Tier>(tier);
  const [crossing, setCrossing] = useState<{
    dir: 'up' | 'down';
    fromTier: Tier;
    toTier: Tier;
    key: number;
  } | null>(null);
  const crossingKeyRef = useRef(0);

  useEffect(() => {
    const prev = prevTierRef.current;
    if (tier === prev) return;
    crossingKeyRef.current += 1;
    const dir: 'up' | 'down' = tier > prev ? 'up' : 'down';
    setCrossing({ dir, fromTier: prev, toTier: tier, key: crossingKeyRef.current });
    playSound(dir === 'up' ? 'tier-up' : 'tier-down');
    prevTierRef.current = tier;
    const lifetime =
      dir === 'up'
        ? Math.max(
            cfg.crossing.twoHeadDurationMs,
            cfg.crossing.bloomDurationMs,
            cfg.crossing.upPulseDurationMs,
            cfg.crossing.sparkleFloatDurationMs,
          ) + 80
        : cfg.crossing.downSweepDurationMs + 60;
    const t = setTimeout(() => setCrossing(null), lifetime);
    return () => clearTimeout(t);
  }, [tier]);

  /* =============================================================== */
  /*  MEASUREMENT — button shell width for SVG border lights         */
  /* =============================================================== */
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [shellSize, setShellSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: cfg.borderHeightPx,
  });
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setShellSize({
          w: Math.round(e.contentRect.width),
          h: Math.round(e.contentRect.height),
        });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* =============================================================== */
  /*  AMBIENT — micro-tremor (Tier 3) with INTERMITTENCE             */
  /*  Calmer than pure sine: tremor is active only for a short burst */
  /*  every cycleMs. Quiet between bursts.                           */
  /* =============================================================== */
  const tremorX = useMotionValue(0);
  const tremorY = useMotionValue(0);
  const [tremorActive, setTremorActive] = useState(false);
  const tremorOn = tier === 3 && !reduced;
  useAnimationFrame((t) => {
    if (!tremorOn) {
      if (tremorActive) setTremorActive(false);
      tremorX.set(0);
      tremorY.set(0);
      return;
    }
    const {
      tremorAmplitudePx: amp,
      tremorFrequencyHz: hz,
      tremorCycleMs: cycle,
      tremorBurstMs: burst,
    } = cfg.tier3;
    const phase = t % cycle;
    if (phase > burst) {
      if (tremorActive) setTremorActive(false);
      tremorX.set(0);
      tremorY.set(0);
      return;
    }
    if (!tremorActive) setTremorActive(true);
    // Envelope fades in/out within the burst so edges aren't harsh.
    const env = Math.sin((phase / burst) * Math.PI);
    const w = (2 * Math.PI * hz) / 1000;
    tremorX.set(Math.sin(t * w) * amp * env * 0.7);
    tremorY.set(Math.sin(t * w * 1.31 + 0.7) * amp * env);
  });

  /* =============================================================== */
  /*  AMBIENT — breathing (tiers ≥ 1) — rate scales with tier        */
  /*  Microinteraction (e).                                          */
  /* =============================================================== */
  const breathScale = useMotionValue(1);
  const breathPhaseRef = useRef(0);
  useAnimationFrame((t) => {
    if (reduced || tier < 1) {
      breathScale.set(1);
      breathPhaseRef.current = 0;
      return;
    }
    const period = (cfg.breath.periodByTier[tier] ?? 4000) * speedScale;
    const phase = (t % period) / period;
    breathPhaseRef.current = phase;
    // Smooth sine: 1 → 1 + amp at 50% → 1 at 100%.
    breathScale.set(1 + cfg.breath.amplitude * Math.sin(phase * Math.PI * 2));
  });

  /* =============================================================== */
  /*  AMBIENT — outer glow (Tier 2+) + glow flash on odds update     */
  /* =============================================================== */
  const glowFlashUntilRef = useRef<number>(0);
  const glowProgress = useMotionValue(0);
  const glowOpacity = useMotionValue(0);
  useAnimationFrame((t) => {
    if (reduced || tier < 2) {
      glowOpacity.set(0);
      glowProgress.set(0);
      return;
    }
    const cur = tier >= 3 ? cfg.tier3 : cfg.tier2;
    const dur = cur.glowPulseDurationMs * speedScale;
    const phase = (t % dur) / dur;
    const env = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    const base = cur.glowOpacityMin + (cur.glowOpacityMax - cur.glowOpacityMin) * env;
    glowProgress.set(env);
    // Additive +40% flash boost when odds update (configured at T2 only,
    // but we apply at any T≥2 since glow exists then).
    const flashUntil = glowFlashUntilRef.current;
    let boosted = base;
    if (t < flashUntil) {
      const k = (flashUntil - t) / cfg.tier2.glowFlashDurationMs;
      boosted = Math.min(1, base * (1 + cfg.tier2.glowFlashBoost * k));
    }
    glowOpacity.set(boosted);
  });
  // REGRESSION FIX (Approach B) — the previous box-shadow approach with
  // a non-zero `spread` value produced a visibly pill-shaped halo
  // (the spread literally inflates the shape outline before blurring).
  // Replaced with a duplicate blurred sibling element (rendered below)
  // whose opacity is driven directly by `glowOpacity`. This gives a
  // truly diffuse, shapeless glow.
  // The motion value's role is now: drive the sibling div's opacity.

  /* =============================================================== */
  /*  AMBIENT — inner highlight rim (Tier 2+) out of phase           */
  /* =============================================================== */
  const innerRimOpacity = useMotionValue(0);
  useAnimationFrame((t) => {
    if (reduced || tier < 2) {
      innerRimOpacity.set(0);
      return;
    }
    const cur = tier >= 3 ? cfg.tier3 : cfg.tier2;
    const dur = cur.glowPulseDurationMs * speedScale;
    const offset = cfg.tier2.innerRimPhaseOffsetMs * speedScale;
    const phase = ((t + offset) % dur) / dur;
    const env = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    innerRimOpacity.set(env * cfg.tier2.innerRimOpacityMax);
  });

  // PASS 3 — Heat-haze duplicate-text layer REMOVED. The doubled
  // appearance it produced was a bug. Tier 3 odds now use either layered
  // text-shadow halos (flames) or rising blurred accent blobs (smoke);
  // both keep the text itself perfectly crisp. See OddsEffects.tsx.

  /* =============================================================== */
  /*  AMBIENT — odds typography micro-pulse (Tier 1+)                */
  /* =============================================================== */
  const oddsPulseScale = useMotionValue(1);
  const oddsPulseOpacity = useMotionValue(1);
  useAnimationFrame((t) => {
    if (reduced || tier < 1) {
      oddsPulseScale.set(1);
      oddsPulseOpacity.set(1);
      return;
    }
    const dur = cfg.tier1.oddsPulseDurationMs * speedScale;
    const phase = (t % dur) / dur;
    const env = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    oddsPulseScale.set(1 + (cfg.tier1.oddsPulseScaleMax - 1) * env);
    oddsPulseOpacity.set(1 - (1 - cfg.tier1.oddsPulseOpacityMin) * env);
  });

  /* =============================================================== */
  /*  AMBIENT — SVG border light sweeps (Tier 1+ primary; T3 second) */
  /*  Position is a 0..1 motion value driving strokeDashoffset.      */
  /* =============================================================== */
  const sweepPos = useMotionValue(0);
  const sweepOpacity = useMotionValue(0);
  const sweepPhaseRef = useRef(0);
  useAnimationFrame((t) => {
    if (reduced || tier < 1) {
      sweepOpacity.set(0);
      sweepPos.set(0);
      sweepPhaseRef.current = 0;
      return;
    }
    const cur = tier >= 3 ? cfg.tier3 : tier === 2 ? cfg.tier2 : cfg.tier1;
    const dur = cur.borderSweepDurationMs * speedScale;
    const phase = (t % dur) / dur;
    sweepPhaseRef.current = phase;
    sweepPos.set(phase);

    const active = cur.borderSweepActiveRatio;
    if (active >= 1) {
      sweepOpacity.set(cur.borderSweepOpacity);
    } else if (phase < active) {
      // Fade in/out inside the active region so on/off isn't harsh.
      const local = phase / active;
      sweepOpacity.set(Math.sin(local * Math.PI) * cur.borderSweepOpacity);
    } else {
      sweepOpacity.set(0);
    }
    // POLISH PASS — secondary head removed. Single traveling light only.
  });

  /* =============================================================== */
  /*  AMBIENT — sparkle particles (Tier 3, sparse)                   */
  /* =============================================================== */
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const sparkleIdRef = useRef(0);
  useEffect(() => {
    if (tier < 3 || reduced) return;
    const interval = setInterval(() => {
      const count = 2 + Math.floor(Math.random() * 3);
      const fresh: Sparkle[] = [];
      for (let i = 0; i < count; i++) {
        const side = Math.floor(Math.random() * 4);
        const u = Math.random();
        let x = 0;
        let y = 0;
        if (side === 0) { x = u * 100; y = 0; }
        else if (side === 1) { x = 100; y = u * 100; }
        else if (side === 2) { x = u * 100; y = 100; }
        else { x = 0; y = u * 100; }
        fresh.push({ id: sparkleIdRef.current++, x, y, size: 2 + Math.random() * 2 });
      }
      setSparkles((s) => [...s, ...fresh]);
      setTimeout(
        () => setSparkles((s) => s.slice(fresh.length)),
        cfg.tier3.sparkleDurationMs,
      );
    }, cfg.tier3.sparkleIntervalMs);
    return () => clearInterval(interval);
  }, [tier, reduced]);

  /* =============================================================== */
  /*  ONE-SHOTS — selection-change reactions                         */
  /* =============================================================== */
  const lastCountRef = useRef(selectionCount);
  const countControls = useAnimation();
  const oddsSettleControls = useAnimation();
  const oddsBurstControls = useAnimation(); // POLISH PASS: T3 1.08 scale on add
  const [breath40, setBreath40] = useState(false); // anticipation 40ms compress
  const [t3Burst, setT3Burst] = useState<number | null>(null); // radial burst key
  // POLISH PASS — stacked outline ripples. Cap at 3 simultaneous.
  const [outlineRipples, setOutlineRipples] = useState<number[]>([]);

  /* =============================================================== */
  /*  REGRESSION FIX — Odds glow as a TEXT-SHADOW STACK on the real  */
  /*  text. No duplicate text elements (the previous duplicate-span  */
  /*  approach caused the "doubled odds" bug). The text-shadow is    */
  /*  layered halos OUTSIDE the glyph edges, so the text itself      */
  /*  stays perfectly crisp.                                         */
  /*                                                                 */
  /*  T0 / T1 : 'none'                                                */
  /*  T2      : 4-layer purple halo at static intensity, brief +50%   */
  /*            surge for 300ms on every odds update.                 */
  /*  T3 flames: 4 pulse layers (breathing on 2s cycle) + 5th flicker  */
  /*            layer with deterministic sum-of-sines opacity jitter.  */
  /*  T3 smoke : 4-layer baseline (smoke blobs render behind text).    */
  /* =============================================================== */
  const oddsTextShadow = useMotionValue<string>('none');
  const ganaTextShadow = useMotionValue<string>('none');
  const oddsGlowIntensityRef = useRef(1); // multiplier driven by surges/breath
  const oddsHaloOverrideUntilRef = useRef(0);
  const oddsHaloOverrideMultRef = useRef(1);

  useAnimationFrame((t) => {
    if (reduced || tier < 2) {
      oddsTextShadow.set('none');
      ganaTextShadow.set('none');
      oddsGlowIntensityRef.current = 1;
      return;
    }

    // ---- base intensity multiplier per tier ----
    let mult = 1;
    if (tier === 3) {
      // Breathing pulse — slow inhale/exhale on the WHOLE shadow stack.
      const dur = cfg.tier3.oddsHaloBreatheDurationMs * speedScale;
      const phase = (t % dur) / dur;
      const env = (1 - Math.cos(phase * Math.PI * 2)) / 2;
      // Maps glow min/max opacity range to a stack multiplier.
      mult =
        cfg.tier3.oddsHaloOpacityMin / cfg.tier2.oddsHaloStaticOpacity +
        ((cfg.tier3.oddsHaloOpacityMax - cfg.tier3.oddsHaloOpacityMin) /
          cfg.tier2.oddsHaloStaticOpacity) *
          env;
    }

    // ---- one-shot surge blends out linearly ----
    if (t < oddsHaloOverrideUntilRef.current) {
      const remaining = oddsHaloOverrideUntilRef.current - t;
      const total = cfg.tier2.oddsHaloUpdateDurationMs;
      const k = Math.min(1, remaining / total);
      mult = Math.max(mult, mult + (oddsHaloOverrideMultRef.current - mult) * k);
    }

    oddsGlowIntensityRef.current = mult;

    // ---- compose the layered text-shadow string ----
    // Four base halo layers (always present at T2+). At T3 they breathe.
    const baseLayers = cfg.flames.layers
      .map(([blur, opa]) => {
        const a = Math.min(1, opa * mult).toFixed(3);
        return `0 0 ${blur}px rgba(151,48,255,${a})`;
      })
      .join(', ');

    // Fifth flicker layer — only at T3 + flames variant. Deterministic
    // sum-of-sines for reproducible, debuggable, reduced-motion-safe jitter.
    let flicker = '';
    if (tier === 3 && tier3OddsEffect === 'flames') {
      let sum = 0;
      let weightSum = 0;
      for (const s of cfg.flames.flickerSines) {
        sum += s.weight * Math.sin((2 * Math.PI * s.freqHz * t) / 1000);
        weightSum += s.weight;
      }
      const norm = (sum / weightSum + 1) / 2;
      const opa =
        cfg.flames.flickerOpacityMin +
        norm * (cfg.flames.flickerOpacityMax - cfg.flames.flickerOpacityMin);
      flicker = `, 0 0 ${cfg.flames.flickerBlurPx}px rgba(151,48,255,${opa.toFixed(3)})`;
    }

    oddsTextShadow.set(baseLayers + flicker);

    // Gana — same stack with each layer's alpha scaled down (no flicker).
    const ganaLayers = cfg.flames.layers
      .map(([blur, opa]) => {
        const a = Math.min(
          1,
          opa * mult * cfg.tier3.ganaGlowScaleDown,
        ).toFixed(3);
        return `0 0 ${blur}px rgba(151,48,255,${a})`;
      })
      .join(', ');
    ganaTextShadow.set(ganaLayers);
  });

  useEffect(() => {
    if (selectionCount === lastCountRef.current) return;
    const prev = lastCountRef.current;
    lastCountRef.current = selectionCount;
    if (reduced) return;

    // 1. Anticipation compress (40ms) — runs immediately.
    setBreath40(true);
    setTimeout(() => setBreath40(false), cfg.anticipationDurationMs);

    // 2. Count badge pulse (T1+).
    if (tier >= 1) {
      countControls.start({
        scale: [1, cfg.tier1.countPulseScaleMax, 1],
        transition: { duration: cfg.tier1.countPulseDurationMs / 1000, ease: 'easeOut' },
      });
    }

    // 3. Glow flash boost (T2+).
    if (tier >= 2) {
      glowFlashUntilRef.current = performance.now() + cfg.tier2.glowFlashDurationMs;
    }

    // 4. Settle overshoot (microinteraction d) — AFTER slot completes.
    setTimeout(() => {
      oddsSettleControls.start({
        scale: [1, cfg.settleOvershootScale, 1],
        transition: {
          duration: cfg.settleOvershootDurationMs / 1000,
          ease: 'easeOut',
        },
      });
      playSound('slot-end');
    }, cfg.slotDurationMs);

    // 5. Radial burst at Tier 3 on every selection add.
    if (tier === 3 && selectionCount > prev) {
      const k = Date.now();
      setT3Burst(k);
      playSound('burst');
      setTimeout(
        () => setT3Burst((cur) => (cur === k ? null : cur)),
        cfg.tier3.radialBurstDurationMs + 20,
      );

      // POLISH PASS — Tier 3 outline ripple from button OUTLINE outward.
      // Stacks up to outlineRippleMaxStacked when multiple adds happen
      // rapidly within ~400ms.
      const rippleId = performance.now();
      setOutlineRipples((cur) => {
        const next = [...cur, rippleId];
        if (next.length > cfg.tier3.outlineRippleMaxStacked) {
          return next.slice(next.length - cfg.tier3.outlineRippleMaxStacked);
        }
        return next;
      });
      setTimeout(
        () =>
          setOutlineRipples((cur) => cur.filter((id) => id !== rippleId)),
        cfg.tier3.outlineRippleDurationMs + 60,
      );

      // POLISH PASS — Tier 3 odds-value burst (in addition to slot anim).
      oddsBurstControls.start({
        scale: [1, cfg.tier3.oddsAddBurstScale, 1],
        transition: {
          duration: cfg.tier3.oddsAddBurstDurationMs / 1000,
          ease: 'easeOut',
        },
      });
    }

    // REGRESSION FIX — Tier 2+ odds text-shadow surge on update.
    // We now drive a STACK MULTIPLIER instead of a duplicate-element opacity.
    if (tier >= 2) {
      const peakMult = tier === 3 ? 2.0 : cfg.tier2.oddsHaloUpdateBoost; // T2 +50%, T3 +100%
      oddsHaloOverrideMultRef.current = peakMult;
      oddsHaloOverrideUntilRef.current =
        performance.now() + cfg.tier2.oddsHaloUpdateDurationMs;
    }
  }, [
    selectionCount,
    tier,
    reduced,
    countControls,
    oddsSettleControls,
    oddsBurstControls,
  ]);

  /* =============================================================== */
  /*  ONE-SHOT — weight-gain anchor when entering Tier 2             */
  /* =============================================================== */
  const weightAnchorY = useMotionValue(0);
  const weightAnchorShadow = useMotionValue('0 0 0 rgba(0,0,0,0)');
  const prevTierForAnchorRef = useRef(tier);
  useEffect(() => {
    const prev = prevTierForAnchorRef.current;
    prevTierForAnchorRef.current = tier;
    if (reduced) return;
    if (prev < 2 && tier >= 2) {
      // Drop 1px and gain a 0→2px text-shadow underneath, then settle.
      const start = performance.now();
      const dur = cfg.tier2.weightAnchorDurationMs;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        // Out-and-stay: rises quickly then holds, then settles.
        const easeOut = 1 - Math.pow(1 - t, 3);
        weightAnchorY.set(cfg.tier2.weightAnchorTranslateYPx * easeOut * (1 - t * 0.5));
        weightAnchorShadow.set(
          `0 ${Math.round(2 * easeOut * (1 - t * 0.5))}px 0 rgba(151,48,255,${0.3 * easeOut * (1 - t * 0.5)})`,
        );
        if (t < 1) requestAnimationFrame(tick);
        else {
          weightAnchorY.set(0);
          weightAnchorShadow.set('0 0 0 rgba(0,0,0,0)');
        }
      };
      requestAnimationFrame(tick);
    }
  }, [tier, reduced, weightAnchorY, weightAnchorShadow]);

  /* =============================================================== */
  /*  TIER 3 — Magnetic pointer attraction                           */
  /* =============================================================== */
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const rawMagX = useMotionValue(0);
  const rawMagY = useMotionValue(0);
  const magX = useSpring(rawMagX, {
    stiffness: cfg.tier3.magneticSpringStiffness,
    damping: cfg.tier3.magneticSpringDamping,
  });
  const magY = useSpring(rawMagY, {
    stiffness: cfg.tier3.magneticSpringStiffness,
    damping: cfg.tier3.magneticSpringDamping,
  });
  useEffect(() => {
    if (tier < 3 || reduced) {
      rawMagX.set(0);
      rawMagY.set(0);
      return;
    }
    const handle = (clientX: number, clientY: number) => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > cfg.tier3.magneticRadiusPx) {
        rawMagX.set(0);
        rawMagY.set(0);
        return;
      }
      const k = (1 - dist / cfg.tier3.magneticRadiusPx) * cfg.tier3.magneticMaxTranslatePx;
      rawMagX.set((dx / Math.max(dist, 1)) * k);
      rawMagY.set((dy / Math.max(dist, 1)) * k);
    };
    const onPointerMove = (e: PointerEvent) => handle(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      handle(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [tier, reduced, rawMagX, rawMagY]);

  /* =============================================================== */
  /*  Crossing one-shot motion values                                */
  /* =============================================================== */
  // For up-cross: two heads spawn at top-center (offset 0 wrapped to anchor)
  // and travel in opposite directions until they meet at the bottom (offset 0.5).
  const upHeadCW = useMotionValue(0);
  const upHeadCCW = useMotionValue(0);
  const downSweep = useMotionValue(0);

  useEffect(() => {
    if (!crossing) return;
    if (reduced) return;
    if (crossing.dir === 'up') {
      const start = performance.now();
      const dur = cfg.crossing.twoHeadDurationMs;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        upHeadCW.set(t * 0.5);   // 0 → 0.5 clockwise
        upHeadCCW.set(t * 0.5);  // 0 → 0.5 counter-clockwise (rendered with reverse=true)
        if (t < 1 && crossing && crossing.dir === 'up') requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } else {
      const start = performance.now();
      const dur = cfg.crossing.downSweepDurationMs;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / dur);
        downSweep.set(t);
        if (t < 1 && crossing && crossing.dir === 'down') requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, [crossing, reduced, upHeadCW, upHeadCCW, downSweep]);

  /* =============================================================== */
  /*  Live state push for debug overlay                              */
  /* =============================================================== */
  useMotionValueEvent(sweepPos, 'change', (v) => {
    onLiveState?.({
      tier,
      cumulativeOdds,
      tremorActive,
      borderPhase: v,
      breathPhase: breathPhaseRef.current,
    });
  });

  /* =============================================================== */
  /*  DERIVED display                                                */
  /* =============================================================== */
  const oddsLabel = useMemo(() => formatOdds(cumulativeOdds), [cumulativeOdds]);
  const stake = 200;
  const potentialWin = Math.round(cumulativeOdds * stake);

  /* =============================================================== */
  /*  Inner CTA press handler — placeholder                          */
  /* =============================================================== */
  const onPress = useCallback(() => {
    // No-op (presented as visual prototype).
  }, []);

  /* =============================================================== */
  /*  RENDER                                                         */
  /* =============================================================== */
  const isUpCross = crossing?.dir === 'up';
  const isDownCross = crossing?.dir === 'down';

  return (
    <div className="relative w-full px-4 pb-6 pt-2">
      {/* REGRESSION FIX — diffuse outer glow via a duplicate BLURRED sibling
          element (Approach B). The previous box-shadow with non-zero
          `spread` produced a visibly pill-shaped halo; this approach
          produces a truly shapeless soft glow because the entire colored
          element is fed through `filter: blur`. Opacity drives breathing. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          inset: '-12px 4px',
          background:
            'radial-gradient(ellipse 65% 100% at center, rgba(151,48,255,0.95) 0%, rgba(151,48,255,0.55) 35%, rgba(151,48,255,0.15) 70%, transparent 100%)',
          filter: 'blur(20px)',
          opacity: glowOpacity,
        }}
      />

      {/* Mandatory radial bloom on up-crossings */}
      <AnimatePresence>
        {isUpCross && !reduced && (
          <motion.div
            key={`bloom-${crossing!.key}`}
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[34px] h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(151,48,255,0.6) 0%, rgba(75,32,255,0.22) 40%, transparent 70%)',
              filter: 'blur(14px)',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{
              scale: cfg.crossing.bloomScale * 6,
              opacity: [0, cfg.crossing.bloomOpacityMax, 0],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: cfg.crossing.bloomDurationMs / 1000, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* OUTER WRAPPER — breath scale + magnetic translate */}
      <motion.div
        className="relative"
        style={{
          scale: breathScale,
          x: magX,
          y: magY,
        }}
      >
        {/* POLISH PASS — Outline ripples emanating from button outline OUTWARD.
            Rendered as siblings of the inner button so they're outside the
            shell's overflow-hidden clip. */}
        <AnimatePresence>
          {!reduced &&
            outlineRipples.map((id) => (
              <OutlineRipple
                key={id}
                id={id}
                radius={cfg.borderRadiusPx * 2} // visual pill radius
                accent="#9730ff"
              />
            ))}
        </AnimatePresence>

        {/* INNER BUTTON — tremor + press + crossing pulse */}
        <motion.button
          ref={buttonRef}
          type="button"
          onClick={onPress}
          className="relative block w-full select-none"
          style={{
            // Tremor is layered on top of any other transforms via x/y.
            x: tremorX,
            y: tremorY,
          }}
          whileTap={{ scale: cfg.pressScale }}
          animate={
            isUpCross
              ? { scale: [1, cfg.crossing.upPulseScalePeak, 1] }
              : breath40
                ? { scale: [1, cfg.anticipationScale, 1] }
                : { scale: 1 }
          }
          transition={
            isUpCross
              ? {
                  type: 'spring',
                  stiffness: cfg.crossing.upSpringStiffness,
                  damping: cfg.crossing.upSpringDamping,
                  mass: 0.5,
                  duration: cfg.crossing.upPulseDurationMs / 1000,
                }
              : breath40
                ? { duration: cfg.anticipationDurationMs / 1000 }
                : { duration: 0.22, ease: 'easeOut' }
          }
        >
          {/* PILL SHELL — base gradient + 1px border (Figma exact) */}
          <div
            ref={shellRef}
            className="relative flex h-[56px] w-full items-center overflow-hidden rounded-[56px] border border-[#4b20ff]"
            style={{
              backgroundImage: 'linear-gradient(30.4deg, #14083d 0%, #230c3e 100%)',
            }}
          >
            {/* ----- Ambient SVG border light (single head, two-layer halo) ----- */}
            <BorderLight
              width={shellSize.w}
              height={shellSize.h}
              radius={cfg.borderRadiusPx}
              dashLength={
                tier >= 3
                  ? cfg.tier3.borderDashLengthPx
                  : tier === 2
                    ? cfg.tier2.borderDashLengthPx
                    : cfg.tier1.borderDashLengthPx
              }
              offset={sweepPos}
              opacity={sweepOpacity}
            />
            {/* POLISH PASS — second head removed. T3 differentiation now
                comes from cycle speed (1.6s) and opacity (0.8), not a
                second light source. */}

            {/* ----- Up-cross: TWO heads from top, opposite directions ----- */}
            {isUpCross && !reduced && (
              <>
                <BorderLight
                  width={shellSize.w}
                  height={shellSize.h}
                  radius={cfg.borderRadiusPx}
                  strokeWidth={cfg.borderLightStrokeWidthPx + 0.5}
                  dashLength={cfg.crossing.twoHeadDashLengthPx}
                  offset={upHeadCW}
                  opacity={cfg.crossing.twoHeadOpacityPeak}
                  anchor={0.25} // top-center on a [right, bottom, left, top] perimeter walk
                />
                <BorderLight
                  width={shellSize.w}
                  height={shellSize.h}
                  radius={cfg.borderRadiusPx}
                  strokeWidth={cfg.borderLightStrokeWidthPx + 0.5}
                  dashLength={cfg.crossing.twoHeadDashLengthPx}
                  offset={upHeadCCW}
                  opacity={cfg.crossing.twoHeadOpacityPeak}
                  anchor={0.25}
                  reverse
                />
                {/* Collision flash at bottom-center, 300ms after spawn */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full"
                  style={{
                    width: cfg.crossing.collisionFlashSizePx,
                    height: cfg.crossing.collisionFlashSizePx,
                    background:
                      'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.5) 40%, transparent 70%)',
                    filter: 'blur(2px)',
                  }}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 1, 0], scale: [0.3, 1.1, 0.9] }}
                  transition={{
                    delay: cfg.crossing.collisionFlashDelayMs / 1000,
                    duration: cfg.crossing.collisionFlashDurationMs / 1000,
                    ease: 'easeOut',
                  }}
                />
                {/* One floating sparkle from the collision point */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-white"
                  style={{ boxShadow: '0 0 6px rgba(255,255,255,0.9)' }}
                  initial={{ opacity: 0, y: 0, scale: 0 }}
                  animate={{
                    opacity: [0, 1, 0],
                    y: [0, -cfg.crossing.sparkleFloatRisePx],
                    scale: [0, 1, 0.6],
                  }}
                  transition={{
                    delay: cfg.crossing.collisionFlashDelayMs / 1000,
                    duration: cfg.crossing.sparkleFloatDurationMs / 1000,
                    ease: 'easeOut',
                  }}
                />
              </>
            )}

            {/* ----- Down-cross: single dim reverse sweep ----- */}
            {isDownCross && !reduced && (
              <BorderLight
                width={shellSize.w}
                height={shellSize.h}
                radius={cfg.borderRadiusPx}
                strokeWidth={cfg.borderLightStrokeWidthPx}
                dashLength={cfg.crossing.downDashLengthPx}
                offset={downSweep}
                opacity={cfg.crossing.downSweepOpacity}
                reverse
              />
            )}

            {/* ----- Inner highlight rim (T2+), out of phase with outer glow */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-px rounded-[55px]"
              style={{
                opacity: innerRimOpacity,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)',
              }}
            />

            {/* ----- Tier 3 cross-flicker overlay on the whole button surface */}
            {tier >= 3 && !reduced && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 mix-blend-overlay fire-shimmer-overlay"
                style={
                  speedScale > 1
                    ? { animationDuration: `${(cfg.tier3.fireSweepSecondaryDurationMs / 1000) * speedScale}s` }
                    : undefined
                }
              />
            )}

            {/* ----- Tier 3 ambient sparkles (sparse) ----- */}
            {tier >= 3 && !reduced && (
              <div className="pointer-events-none absolute inset-0">
                {sparkles.map((s) => (
                  <motion.span
                    key={s.id}
                    className="absolute rounded-full bg-white"
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: s.size,
                      height: s.size,
                      boxShadow: '0 0 6px rgba(255,255,255,0.9)',
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.5] }}
                    transition={{
                      duration: cfg.tier3.sparkleDurationMs / 1000,
                      ease: 'easeOut',
                    }}
                  />
                ))}
              </div>
            )}

            {/* ----- Tier 3 radial burst on selection add ----- */}
            <AnimatePresence>
              {t3Burst !== null && !reduced && (
                <motion.div
                  key={`burst-${t3Burst}`}
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    boxShadow: '0 0 0 1.5px rgba(255,255,255,0.8)',
                  }}
                  initial={{
                    width: cfg.tier3.radialBurstStartPx,
                    height: cfg.tier3.radialBurstStartPx,
                    opacity: cfg.tier3.radialBurstOpacityStart,
                  }}
                  animate={{
                    width: cfg.tier3.radialBurstEndPx * 2,
                    height: cfg.tier3.radialBurstEndPx * 2,
                    opacity: 0,
                  }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: cfg.tier3.radialBurstDurationMs / 1000,
                    ease: 'easeOut',
                  }}
                />
              )}
            </AnimatePresence>

            {/* ============================================ */}
            {/*  CONTENT ROW — Bets / Momio / Monto / Gana   */}
            {/* ============================================ */}
            <div className="relative flex h-full flex-1 items-center gap-3 pl-5 pr-2">
              {/* BETS count with count-pulse on update */}
              <motion.div
                className="flex flex-col items-start justify-center"
                animate={countControls}
                initial={{ scale: 1 }}
              >
                <motion.div
                  className="flex h-[21px] items-center"
                  animate={
                    tier >= 1
                      ? {
                          textShadow: [
                            '0 0 0px rgba(151,48,255,0)',
                            `0 0 10px ${cfg.tier1.countPulseGlowColor}`,
                            '0 0 0px rgba(151,48,255,0)',
                          ],
                        }
                      : { textShadow: '0 0 0px rgba(151,48,255,0)' }
                  }
                  transition={{ duration: cfg.tier1.countPulseDurationMs / 1000 }}
                  key={`count-${selectionCount}`} // force re-trigger on every change
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: '21px',
                    color: '#fbfbfb',
                  }}
                >
                  <SlotNumber value={String(selectionCount)} reducedMotion={reduced} />
                </motion.div>
                <p
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: 'rgba(251,251,251,0.5)',
                  }}
                >
                  {selectionCount === 1 ? 'Bet' : 'Bets'}
                </p>
              </motion.div>

              {/* MOMIO — layered: heat-haze + glow halo + real text with all
                  transforms (slot, pulse, settle, fire, char wave, burst) */}
              <div className="flex flex-col items-start justify-center">
                <div className="relative flex h-[21px] items-center">
                  {/* REGRESSION FIX — All duplicate text elements REMOVED.
                      The glow is text-shadow only, applied to the real text
                      below via a motion value (`oddsTextShadow`).
                      Smoke variant still renders blob shapes BEHIND the text
                      (not duplicate text), which is allowed. */}
                  {tier >= 3 && !reduced && tier3OddsEffect === 'smoke' && (
                    <OddsSmokeEffect />
                  )}
                  {/* Real momio value — wrapped in two motion layers:
                      outer = T3 add burst (scale 1.08)
                      inner = post-slot settle overshoot (scale 1.04)
                      The text-shadow stack is applied here via motion value. */}
                  <motion.div
                    className="relative flex items-center gap-1"
                    animate={oddsBurstControls}
                    initial={{ scale: 1 }}
                    style={{
                      scale: oddsPulseScale,
                      opacity: oddsPulseOpacity,
                      y: weightAnchorY,
                      // REGRESSION FIX — text-shadow is a motion value,
                      // recomputed each frame to drive breathing + flicker
                      // entirely on the REAL text. No duplicate spans.
                      textShadow:
                        tier >= 2 ? oddsTextShadow : weightAnchorShadow,
                      fontFamily: 'Red Hat Display, sans-serif',
                      fontWeight: tier >= 2 ? cfg.tier2.oddsFontWeight : 900,
                      fontSize: 14,
                      lineHeight: '21px',
                      color: '#fbfbfb',
                    }}
                  >
                    <motion.span
                      animate={oddsSettleControls}
                      initial={{ scale: 1 }}
                      style={{ display: 'inline-block' }}
                    >
                      <SlotNumber
                        value={oddsLabel}
                        reducedMotion={reduced}
                        innerCharClassName={
                          tier >= 3 && !reduced
                            ? `fire-shimmer odds-char-wave${
                                speedScale > 1 ? ' fire-shimmer-slow' : ''
                              }`
                            : ''
                        }
                      />
                    </motion.span>
                  </motion.div>
                </div>
                <p
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: 'rgba(251,251,251,0.5)',
                  }}
                >
                  Momio
                </p>
              </div>

              {/* MONTO */}
              <div className="flex flex-col items-start justify-center">
                <p
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: '21px',
                    color: '#fbfbfb',
                  }}
                >
                  ${stake}
                </p>
                <p
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 500,
                    fontSize: 12,
                    lineHeight: '16px',
                    color: 'rgba(251,251,251,0.5)',
                  }}
                >
                  Monto
                </p>
              </div>
            </div>

            {/* RIGHT — Gana CTA (potential winnings) */}
            <div className="relative flex h-[56px] w-[112px] shrink-0 items-center justify-center p-[6px]">
              <div
                className="relative flex h-full w-full flex-col items-center justify-center rounded-[100px] px-[6px]"
                style={{
                  backgroundImage:
                    'linear-gradient(58.9deg, #4b20ff 0%, #9730ff 100%)',
                  boxShadow: 'inset 0 0 12px rgba(0,0,0,0.24)',
                }}
              >
                <motion.div
                  className="relative flex items-center"
                  style={{
                    fontFamily: 'Red Hat Display, sans-serif',
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: '21px',
                    color: '#fbfbfb',
                    // REGRESSION FIX — Gana glow is now text-shadow on the
                    // real text, no duplicate text element.
                    textShadow: tier >= 2 ? ganaTextShadow : 'none',
                  }}
                >
                  <SlotNumber
                    value={`$${potentialWin}`}
                    reducedMotion={reduced}
                    innerCharClassName={
                      tier >= 3 && !reduced
                        ? `odds-char-wave${speedScale > 1 ? ' fire-shimmer-slow' : ''}`
                        : ''
                    }
                  />
                </motion.div>
                <div className="flex items-center justify-center gap-1 pl-1.5">
                  <p
                    style={{
                      fontFamily: 'Red Hat Display, sans-serif',
                      fontWeight: 500,
                      fontSize: 12,
                      lineHeight: '16px',
                      color: '#fbfbfb',
                    }}
                  >
                    Gana
                  </p>
                  <svg viewBox="0 0 14 14" width="10" height="10" fill="none" aria-hidden>
                    <path
                      d="M5 3l4 4-4 4"
                      stroke="#fbfbfb"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </motion.button>
      </motion.div>
    </div>
  );
}
