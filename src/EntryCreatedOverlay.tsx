import {
  animate,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useVelocity,
  type MotionValue,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

/**
 * EntryCreatedOverlay — swipe-to-confirm success animation.
 *
 * Ported from the "genie" prototype (github.com/Jate099/entry-success-animation),
 * adapted to our slip + navbar:
 *   1. A green "¡Entrada creada!" card emerges where the slip was — a circular
 *      clip-path reveal from the card's center (keyframes `greenCircleIn` /
 *      `greenContentIn` in index.css), check + text scaling in with it — and
 *      holds.
 *   2. It performs a genie flight straight into the "Mis entradas" tab —
 *      velocity/position-derived squash & stretch, a base shrink envelope,
 *      rotation from x-velocity, and a borderRadius morph, driven by two
 *      springs launched together (no anticipation). No keyframes.
 *   3. The ticket fades out over its last few px of travel so it is fully
 *      gone `vanish.gapPx` above the tab — never overlapping it. onCatch()
 *      fires at that vanish moment (tab icon bumps to "catch" it); onDone()
 *      follows `doneDelayMs` later (app then pops the badge + "¿Reusar?").
 *
 * Flight timing lives in `cfg`; entrance timing in the index.css keyframes.
 */

const cfg = {
  confirmedHoldMs: 900,
  // One-shot celebration burst when the circular reveal completes — the
  // T4 fire-spark dots from ButtonPreviewMomios, recolored to the success
  // green, exploding radially outward from the card's perimeter.
  burst: {
    count: 26,
    distanceMinPx: 28, // outward travel
    distanceMaxPx: 72,
    sizeMinPx: 3,
    sizeMaxPx: 7,
    durationMinMs: 420,
    durationMaxMs: 700,
    angleJitterRad: 0.3, // deviation from the pure radial direction
  },
  // Explosion "pop" on the card when the reveal completes (fires with the
  // burst): a subtle squash & stretch that springs back with overshoot, plus
  // a green glow flash that decays. Reads as something detonating inside.
  pop: {
    scaleX: 1.035, // initial stretch (springs back to 1 with a gentle overshoot)
    scaleY: 0.965,
    spring: { stiffness: 300, damping: 17 },
    glowDecayMs: 620, // glow flashes to peak, then eases back to base
  },
  genie: {
    y: { stiffness: 240, damping: 24, mass: 0.8 },
    x: { stiffness: 260, damping: 26, mass: 0.7 },
    deformSmoothing: { stiffness: 220, damping: 30, mass: 1 },
    velocitySmoothing: { stiffness: 200, damping: 30, mass: 1 },
    baseScale: { yAnchors: [0, 0.65, 0.85, 1], scaleAnchors: [1, 0.3, 0.12, 0.05] },
    deform: {
      anchors: [0, 0.65, 1],
      scaleY: [1, 0.8, 1],
      scaleX: [1, 1.2, 1],
    },
    rotation: {
      vRange: [-150, 0, 150] as [number, number, number],
      degRange: [3, 0, -3] as [number, number, number],
    },
    borderRadius: { yAnchors: [0, 0.65, 0.85, 1], radiusAnchors: [20, 8, 4, 4] },
    // Position-driven vanish: fade runs over the last `fadePx` of travel and
    // completes with the ticket's leading edge `gapPx` above the tab's top.
    // Keep fadePx small — the whole flight is only ~80px of y travel, so a
    // wide window makes the ticket disappear mid-flight.
    vanish: { gapPx: 3, fadePx: 12 },
    doneDelayMs: 150, // onDone this long after the vanish/catch moment
  },
};

const GREEN_BG =
  'radial-gradient(ellipse at center, rgba(41,194,138,0.95) 0%, rgba(29,172,124,0.95) 50%, rgba(5,150,105,0.95) 100%)';
const GREEN_GLOW = '0 0 16px 0 rgba(54,229,169,0.36)';

/** 48×48 circular check icon. */
function CheckBadge() {
  return (
    <svg viewBox="0 0 48 48" width="48" height="48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="22" stroke="white" strokeWidth="2" />
      <path
        d="M15 24.5l6 6 12-13"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The green "¡Entrada creada!" face — fills its rounded parent. `entering`
 * plays the content pop (check + text scale in with the circular reveal). */
function GreenFace({ entering = false }: { entering?: boolean }) {
  return (
    <div
      className="absolute inset-0"
      style={{ borderRadius: 'inherit', backgroundImage: GREEN_BG, boxShadow: GREEN_GLOW }}
    >
      <div
        className={`flex h-full w-full flex-col items-center justify-center gap-3${
          entering ? ' animate-[greenContentIn_0.2s_cubic-bezier(0.16,1,0.3,1)]' : ''
        }`}
      >
        <CheckBadge />
        <p className="text-[16px] font-bold leading-6 text-white">¡Entrada creada!</p>
      </div>
    </div>
  );
}

type Rect = { left: number; top: number; width: number; height: number };

type BurstSpark = {
  id: number;
  leftPct: number; // spawn point on the card perimeter, % of card size
  topPct: number;
  dx: number; // outward travel in px
  dy: number;
  size: number;
  durationMs: number;
};

/** Sparks on the card perimeter, aimed radially outward (+ jitter). */
function makeBurst(): BurstSpark[] {
  const b = cfg.burst;
  // Nominal card aspect (≈350×184) — corrects the radial angle for the
  // percentage coordinate space so corners still fire diagonally.
  const aspect = 1.9;
  return Array.from({ length: b.count }, (_, id) => {
    // Horizontal sides are ~2× longer, so they get 2/3 of the spawns.
    const horizontal = Math.random() < 2 / 3;
    const along = Math.random() * 100;
    const far = Math.random() < 0.5 ? 0 : 100;
    const leftPct = horizontal ? along : far;
    const topPct = horizontal ? far : along;
    const angle =
      Math.atan2(topPct - 50, (leftPct - 50) / aspect) +
      (Math.random() * 2 - 1) * b.angleJitterRad;
    const distance =
      b.distanceMinPx + Math.random() * (b.distanceMaxPx - b.distanceMinPx);
    return {
      id,
      leftPct,
      topPct,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: b.sizeMinPx + Math.random() * (b.sizeMaxPx - b.sizeMinPx),
      durationMs:
        b.durationMinMs + Math.random() * (b.durationMaxMs - b.durationMinMs),
    };
  });
}

/** The flying genie clone — position-fixed at `from`, genies into `to`. */
function GenieClone({
  from,
  to,
  onCatch,
  onDone,
}: {
  from: Rect;
  to: Rect;
  onCatch: () => void;
  onDone: () => void;
}) {
  const g = cfg.genie;
  // Slip bottom-center → gapPx above the tab's top edge. The y spring LANDS
  // at the vanish point (not the tab center) so the whole flight is visible:
  // the ticket decelerates into the spot just above the tab and dissolves
  // there. Targeting deeper would spend most of the spring's fast early
  // travel past the fade window, blinking the ticket out mid-flight.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top - g.vanish.gapPx - (from.top + from.height);

  const yMV = useMotionValue(0);
  const xMV = useMotionValue(0);

  const smoothXVel = useSpring(useVelocity(xMV), g.velocitySmoothing);

  // Anchor helper — fractions of the total y travel.
  const yAnchors = (m: number[]) => m.map((v) => (dy || 1) * v);

  const baseScale = useTransform(yMV, yAnchors(g.baseScale.yAnchors), g.baseScale.scaleAnchors, {
    clamp: true,
  });
  const smoothDeformY = useSpring(
    useTransform(yMV, yAnchors(g.deform.anchors), g.deform.scaleY, { clamp: true }),
    g.deformSmoothing,
  );
  const smoothDeformX = useSpring(
    useTransform(yMV, yAnchors(g.deform.anchors), g.deform.scaleX, { clamp: true }),
    g.deformSmoothing,
  );
  const scaleY = useTransform(
    [baseScale, smoothDeformY] as MotionValue<number>[],
    (l: number[]) => l[0] * l[1],
  );
  const scaleX = useTransform(
    [baseScale, smoothDeformX] as MotionValue<number>[],
    (l: number[]) => l[0] * l[1],
  );
  const rotate = useTransform(smoothXVel, g.rotation.vRange, g.rotation.degRange);
  const borderRadius = useTransform(
    yMV,
    yAnchors(g.borderRadius.yAnchors),
    g.borderRadius.radiusAnchors,
    { clamp: true },
  );
  // Fade tied to position, not time — fully transparent at the landing spot.
  const opacityMV = useTransform(
    yMV,
    [dy - g.vanish.fadePx, dy],
    [1, 0],
    { clamp: true },
  );

  useEffect(() => {
    let caught = false;
    let done = false;
    const fireDone = () => {
      if (done) return;
      done = true;
      onDone();
    };
    const timers: number[] = [];

    // The "catch": the moment the ticket is (within 1px of) landed — now
    // invisible, just shy of the tab — the icon bumps; onDone follows shortly.
    const unsub = yMV.on('change', (v) => {
      if (caught || v < dy - 1) return;
      caught = true;
      onCatch();
      timers.push(window.setTimeout(fireDone, g.doneDelayMs));
    });

    const ya = animate(yMV, dy, { type: 'spring', ...g.y });
    const xa = animate(xMV, dx, { type: 'spring', ...g.x });
    // Safety net — if the vanish point is somehow never crossed, still finish.
    ya.then(() => timers.push(window.setTimeout(fireDone, g.doneDelayMs)));

    return () => {
      unsub();
      ya.stop();
      xa.stop();
      timers.forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      style={{
        position: 'fixed',
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        transformOrigin: '50% 100%',
        zIndex: 60,
        pointerEvents: 'none',
        x: xMV,
        y: yMV,
        scaleX,
        scaleY,
        rotate,
        opacity: opacityMV,
        borderRadius,
      }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: 'inherit' }}>
        <GreenFace />
      </div>
    </motion.div>
  );
}

export function EntryCreatedOverlay({
  onDone,
  onCatch,
  onCovered,
}: {
  onDone: () => void;
  onCatch: () => void;
  /** Circular reveal finished — the green card now fully covers the slip. */
  onCovered?: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<{ from: Rect; to: Rect } | null>(null);
  // Celebration sparks — generated once, when the circular reveal completes.
  const [burst, setBurst] = useState<BurstSpark[] | null>(null);

  // Explosion "pop" — squash & stretch (springs back with overshoot) and a
  // green glow flash (glow 0→1→0) fired when the reveal completes. `cardShadow`
  // reads GREEN_GLOW exactly at glow=0, so it's a seamless base + flash.
  const cardScaleX = useMotionValue(1);
  const cardScaleY = useMotionValue(1);
  const glow = useMotionValue(0);
  const cardShadow = useTransform(
    glow,
    (g) => `0 0 ${16 + g * 44}px ${g * 10}px rgba(54,229,169,${0.36 + g * 0.5})`,
  );

  const handleRevealEnd = () => {
    onCovered?.();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setBurst((b) => b ?? makeBurst());
    // Squash & stretch, then spring-settle with overshoot.
    cardScaleX.set(cfg.pop.scaleX);
    cardScaleY.set(cfg.pop.scaleY);
    animate(cardScaleX, 1, { type: 'spring', ...cfg.pop.spring });
    animate(cardScaleY, 1, { type: 'spring', ...cfg.pop.spring });
    // Green glow flash → decay to base.
    glow.set(1);
    animate(glow, 0, { duration: cfg.pop.glowDecayMs / 1000, ease: 'easeOut' });
  };

  // Hold the green card in place, then measure slip + tab and start the flight.
  // The flight must never launch with the slip still mounted behind it, so
  // onCovered fires here too as a fallback (idempotent) in case the card's
  // animationend event was missed.
  useEffect(() => {
    const t = window.setTimeout(() => {
      onCovered?.();
      const from = cardRef.current?.getBoundingClientRect();
      const tab = document.querySelector('[data-tab="entradas"]')?.getBoundingClientRect();
      if (from && tab) {
        setFlight({ from, to: tab });
      } else {
        onDone();
      }
    }, cfg.confirmedHoldMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[60]"
      style={{ fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* Green "slip turned green" card in its resting spot (until it flies) —
          enters as a circle expanding from the card's center, over the still-
          mounted slip (App unmounts the slip on onCovered). */}
      {!flight && (
        <motion.div
          ref={cardRef}
          className="absolute inset-x-4 bottom-[80px] h-[184px] animate-[greenCircleIn_0.2s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden rounded-[20px]"
          style={{ boxShadow: cardShadow, scaleX: cardScaleX, scaleY: cardScaleY }}
          onAnimationEnd={(e) => {
            if (e.animationName === 'greenCircleIn') handleRevealEnd();
          }}
        >
          <GreenFace entering />
        </motion.div>
      )}
      {/* Celebration burst — green success sparks exploding outward from the
          card's perimeter. A sibling of the card (its overflow:hidden would
          clip them); after it in the DOM so they paint on top. */}
      {!flight && burst && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-4 bottom-[80px] h-[184px]"
        >
          {burst.map((s) => (
            <motion.span
              key={s.id}
              className="absolute rounded-full"
              style={{
                left: `${s.leftPct}%`,
                top: `${s.topPct}%`,
                width: s.size,
                height: s.size,
                translateX: '-50%',
                translateY: '-50%',
                background:
                  'radial-gradient(circle, #ffffff 0%, #36e5a9 45%, rgba(41,194,138,0) 100%)',
                boxShadow:
                  '0 0 8px rgba(54,229,169,0.95), 0 0 14px rgba(41,194,138,0.6)',
              }}
              initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
              animate={{
                x: s.dx,
                y: s.dy,
                opacity: [0, 1, 1, 0],
                // Shrink as it decelerates — same read as the T4 spark dots.
                scale: [1, 1, 0.9, 0.35],
              }}
              transition={{
                duration: s.durationMs / 1000,
                ease: [0.2, 0.7, 0.3, 1], // explosion: fast launch, decelerate
                opacity: { times: [0, 0.08, 0.6, 1] },
                scale: { times: [0, 0.1, 0.6, 1] },
              }}
            />
          ))}
        </div>
      )}
      {flight && (
        <GenieClone from={flight.from} to={flight.to} onCatch={onCatch} onDone={onDone} />
      )}
    </div>
  );
}
