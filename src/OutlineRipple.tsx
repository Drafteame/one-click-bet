import { motion } from 'framer-motion';
import { buttonProgressionConfig as cfg } from './buttonProgressionConfig';

/**
 * OutlineRipple — a one-shot ghost border that emanates from the button's
 * outline OUTWARD into the surrounding UI.
 *
 * Distinct from the existing center radial-burst:
 *  - Center radial burst fires once when CROSSING into Tier 3 (a circle
 *    from the button center).
 *  - OutlineRipple fires on every selection ADD while AT Tier 3 (a rect
 *    matching the button's outline, expanding outward).
 *
 * Both can coexist on the same event (a selection that triggers a T3
 * up-cross). The two visual languages — circle from center, rect from
 * edges — layered together create a stronger payoff than either alone.
 *
 * The ripple MUST NOT be clipped by the button's overflow:hidden shell —
 * caller places this in a wrapper that's outside that shell.
 *
 * Rapid adds stack up to `outlineRippleMaxStacked` simultaneously; older
 * ripples are dropped by the parent when the cap is exceeded.
 */
type Props = {
  /** Unique id for AnimatePresence key. */
  id: number;
  /** Border radius matching the button (pill = full height / 2). */
  radius: number;
  /** Accent stroke color. Uses the existing button-gradient endpoint —
   *  NOT the new `#9730FF` border-light purple. */
  accent: string;
};

export function OutlineRipple({ id, radius, accent }: Props) {
  return (
    <motion.div
      key={id}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        borderRadius: radius,
        borderColor: accent,
        borderStyle: 'solid',
        boxSizing: 'border-box',
        willChange: 'transform, opacity, border-width',
      }}
      initial={{
        scale: 1,
        opacity: cfg.tier3.outlineRippleOpacityStart,
        borderWidth: cfg.tier3.outlineRippleStrokeStartPx,
      }}
      animate={{
        scale: cfg.tier3.outlineRippleScalePeak,
        opacity: 0,
        borderWidth: cfg.tier3.outlineRippleStrokeEndPx,
      }}
      transition={{
        duration: cfg.tier3.outlineRippleDurationMs / 1000,
        ease: cfg.tier3.outlineRippleEase,
      }}
    />
  );
}
