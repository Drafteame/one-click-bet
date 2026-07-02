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
 *   1. A green "¡Entrada creada!" card appears where the slip was and holds.
 *   2. It performs a macOS-style genie flight into the "Mis entradas" tab —
 *      velocity/position-derived squash & stretch, a base shrink envelope,
 *      rotation from x-velocity, and a borderRadius morph, all driven by two
 *      springs (y with anticipation lift, x delayed). No keyframes.
 *   3. onCatch() fires at ~88% so the tab icon bumps to "catch" the ticket;
 *      onDone() fires when the flight ends (app then pops the count badge +
 *      "¿Reusar?" prompt).
 *
 * All timing lives in `cfg` — tweak there.
 */

const cfg = {
  confirmedHoldMs: 900,
  genie: {
    totalMs: 950,
    y: { stiffness: 95, damping: 16, mass: 1.15, velocity: -800 },
    x: { stiffness: 150, damping: 22, mass: 0.75, delayMs: 235 },
    deformSmoothing: { stiffness: 220, damping: 30, mass: 1 },
    velocitySmoothing: { stiffness: 200, damping: 30, mass: 1 },
    liftPeakY: -30,
    baseScale: { yAnchors: [0, 0.65, 0.85, 1], scaleAnchors: [1, 0.3, 0.12, 0.05] },
    deform: {
      anchors: [-1, 0, 0.65, 1],
      scaleY: [1.08, 1, 0.8, 1],
      scaleX: [0.92, 1, 1.2, 1],
    },
    rotation: {
      vRange: [-150, 0, 150] as [number, number, number],
      degRange: [3, 0, -3] as [number, number, number],
    },
    borderRadius: { yAnchors: [0, 0.65, 0.85, 1], radiusAnchors: [20, 8, 4, 4] },
    opacity: { delayMs: 700, durationMs: 250 },
  },
  iconBumpFireAt: 0.88, // fraction of totalMs
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

/** The green "¡Entrada creada!" face — fills its rounded parent. */
function GreenFace() {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-3"
      style={{ borderRadius: 'inherit', backgroundImage: GREEN_BG, boxShadow: GREEN_GLOW }}
    >
      <CheckBadge />
      <p className="text-[16px] font-bold leading-6 text-white">¡Entrada creada!</p>
    </div>
  );
}

type Rect = { left: number; top: number; width: number; height: number };

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
  // Slip bottom-center → tab center.
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height);

  const yMV = useMotionValue(0);
  const xMV = useMotionValue(0);
  const opacityMV = useMotionValue(1);

  const smoothXVel = useSpring(useVelocity(xMV), g.velocitySmoothing);

  // Anchor helper — negative fractions map onto the lift peak, positive onto dy.
  const yAnchors = (m: number[]) =>
    m.map((v) => (v < 0 ? g.liftPeakY * -v : (dy || 1) * v));

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

  useEffect(() => {
    const stops: Array<() => void> = [];
    const ya = animate(yMV, dy, { type: 'spring', ...g.y });
    stops.push(() => ya.stop());

    const xt = window.setTimeout(() => {
      const a = animate(xMV, dx, { type: 'spring', ...g.x });
      stops.push(() => a.stop());
    }, g.x.delayMs);
    stops.push(() => clearTimeout(xt));

    const ot = window.setTimeout(() => {
      const a = animate(opacityMV, 0, {
        duration: g.opacity.durationMs / 1000,
        ease: 'linear',
      });
      stops.push(() => a.stop());
    }, g.opacity.delayMs);
    stops.push(() => clearTimeout(ot));

    const ct = window.setTimeout(onCatch, g.totalMs * cfg.iconBumpFireAt);
    stops.push(() => clearTimeout(ct));

    const dt = window.setTimeout(onDone, g.opacity.delayMs + g.opacity.durationMs);
    stops.push(() => clearTimeout(dt));

    return () => stops.forEach((s) => s());
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
}: {
  onDone: () => void;
  onCatch: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [flight, setFlight] = useState<{ from: Rect; to: Rect } | null>(null);

  // Hold the green card in place, then measure slip + tab and start the flight.
  useEffect(() => {
    const t = window.setTimeout(() => {
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
      {/* Green "slip turned green" card in its resting spot (until it flies). */}
      {!flight && (
        <div
          ref={cardRef}
          className="absolute inset-x-4 bottom-[80px] h-[184px] animate-[greenIn_0.2s_ease-out] overflow-hidden rounded-[20px]"
          style={{ boxShadow: GREEN_GLOW }}
        >
          <GreenFace />
        </div>
      )}
      {flight && (
        <GenieClone from={flight.from} to={flight.to} onCatch={onCatch} onDone={onDone} />
      )}
    </div>
  );
}
