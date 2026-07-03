import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  usePresence,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import chevronRightIcon from './assets/chevron_right.svg';
import closeIcon from './assets/close.svg';
import editIcon from './assets/edit.svg';
import menuIcon from './assets/menu.svg';
import promoIcon from './assets/promo.png';
import shieldIcon from './assets/shield.svg';
import { buttonProgressionConfig } from './buttonProgressionConfig';
import { ButtonPreviewMomios } from './ButtonPreviewMomios';
import type { Selection } from './types';

/**
 * BetSlipSheet — the one-click bet slip, as a single morphing container.
 *
 * There is only ever ONE bet-slip element on screen. A single shell morphs
 * between two variants by animating its height (+ a squash/stretch pulse)
 * while the two content layers cross-fade — a Liquid-Glass-style morph, not a
 * hide/show of two components:
 *
 *   - COLLAPSED → the EXISTING collapsed bet slip, rendered by the real
 *                 `ButtonPreviewMomios` pill, untouched. This is the resting
 *                 collapsed state.
 *   - EXPANDED  → the purple-glass one-click card: selection(s) +
 *                 Monto/Momio/Ganancia + swipe-to-confirm. 1 selection =
 *                 straight bet; 2+ = parlay (header + horizontal selections).
 *
 * The glass background/border belong to the EXPANDED variant only (a layer
 * that fades in), so when collapsed the shell is transparent and only the
 * ButtonPreviewMomios pill shows — pixel-identical to before.
 *
 * Interaction: tap the pill → onExpand; swipe the card DOWN → onCollapse;
 * swipe the thumb RIGHT → onConfirm; tap × → onRemove; touch the thumb →
 * onKeepAlive (defers auto-collapse).
 */

const STAKE = 200; // fixed demo stake — matches ButtonPreviewMomios
const fmtOdds = (n: number) => `${n.toFixed(2)}x`;

// Morph geometry.
const COLLAPSED_H = 72; // ButtonPreviewMomios footprint (56px pill + 8/8 pad)
// 195px card + 8px bottom inset (the glass card's bottom-2), so the expanded
// card clears the navbar by the same 8px the collapsed pill does via its pb-2.
const EXPANDED_H = 203;

// The persistent glass SURFACE morphs between these two shapes. Both are
// bottom-anchored (bottom-2) and 16px inset (inset-x-4), so at collapsed the
// glass exactly overlaps the real ButtonPreviewMomios capsule (56px tall,
// rounded-[56px] ≈ radius 28) — the morph starts/ends on the pill's shape, so
// the hand-off is invisible and the surface never disappears.
const COLLAPSED_GLASS_H = 56;
const EXPANDED_GLASS_H = EXPANDED_H - 8; // 195 (matches the bottom-2 inset)
const COLLAPSED_GLASS_RADIUS = 28; // capsule for a 56px-tall pill
const EXPANDED_GLASS_RADIUS = 20; // the card corners

// Drag thresholds.
const COLLAPSE_OFFSET_PX = 64;
const COLLAPSE_VELOCITY = 450;
// Swipe UP on the expanded slip opens the full-screen "Resumen" sheet.
const OPEN_LIST_OFFSET_PX = 48;
const OPEN_LIST_VELOCITY = 450;
// The shell itself does NOT translate with the finger — it stays anchored and
// the collapse is expressed as a continuous HEIGHT morph (see collapseP). The
// gesture is read from the raw pointer offset, so elastic can be 0.
const DRAG_ELASTIC = 0;
// Finger distance mapping to a full expand→collapse. Equal to the height delta
// so the card's TOP edge tracks the finger 1:1 as it shrinks (bottom stays
// anchored above the navbar) — a morph, not a slide down the screen.
const COLLAPSE_DRAG_RANGE_PX = EXPANDED_H - COLLAPSED_H;
// Spring for programmatic / release transitions of the morph progress.
const COLLAPSE_SPRING = { type: 'spring', stiffness: 320, damping: 34 } as const;
// Subtle squash while morphing — peaks mid-transition, neutral at both rest
// states so neither the pill nor the card is ever left deformed.
const MORPH_DEFORM_X = 1.03;
const MORPH_DEFORM_Y = 0.98;
// Selection-add squash pulse — a subtle liquid stretch that springs back with
// overshoot (low damping) so it wobbles to rest, like the entry bounce. Fires
// every time a new selection is added to the slip.
const ADD_PULSE_SCALE_X = 1.04;
const ADD_PULSE_SCALE_Y = 0.95;
const ADD_PULSE_SPRING = { stiffness: 340, damping: 13 } as const;
// Squash & stretch pulses. On APPEAR the slip stretches (taller/narrower) then
// settles; on COLLAPSE it squashes (shorter/wider) then settles. Both spring
// back with a touch of overshoot for a liquid feel. Kept small — subtle.
const ENTRY_PULSE_SCALE_X = 0.92;
const ENTRY_PULSE_SCALE_Y = 1.11;
// Springier settle for the appear pulse → a touch of overshoot makes the
// squash & stretch clearly visible without feeling heavy.
const ENTRY_PULSE_SPRING = { stiffness: 320, damping: 12 } as const;
const COLLAPSE_PULSE_SCALE_X = 1.03;
const COLLAPSE_PULSE_SCALE_Y = 0.95;
const PULSE_SPRING = { stiffness: 300, damping: 16 } as const;
// Swipe-to-confirm only completes when the thumb is pinned at the track's far
// end (within this tolerance) — any partial swipe snaps back instead.
const CONFIRM_END_TOLERANCE_PX = 2;
// Thumb inset from the track edge (matches the thumb's left-[2px]).
const THUMB_INSET_PX = 2;
// Simulated ticket-creation time — the thumb shows a spinner for this long
// after a completed swipe, then onConfirm fires the success flow.
const CONFIRM_LOADER_MS = 900;

const GLASS_BG = 'linear-gradient(64.6deg, #14083d 0%, #230c3e 100%)';
const PURPLE_CTA = 'linear-gradient(70.5deg, #4b20ff 0%, #9730ff 100%)';

type Props = {
  selections: Selection[];
  cumulativeOdds: number;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onRemove: (id: string) => void;
  onConfirm: () => void;
  /** Called on swipe-to-confirm interaction so the 4s auto-collapse resets. */
  onKeepAlive: () => void;
  /** Parlay "Lista" tab — opens the full-screen summary sheet. */
  onOpenList: () => void;
};

export function BetSlipSheet({
  selections,
  cumulativeOdds,
  expanded,
  onExpand,
  onCollapse,
  onRemove,
  onConfirm,
  onKeepAlive,
  onOpenList,
}: Props) {
  const potentialWin = Math.round(cumulativeOdds * STAKE);
  const isParlay = selections.length >= 2;
  const orderedSelections = [...selections].reverse(); // latest first

  // Mount/unmount slide (mirrors BetSlipShell — declarative initial/animate
  // strands at `initial` under React 18 StrictMode, so animate by hand).
  const [isPresent, safeToRemove] = usePresence();
  const y = useMotionValue(260);
  const opacity = useMotionValue(0);
  useEffect(() => {
    if (isPresent) {
      const a1 = animate(y, 0, { type: 'spring', stiffness: 420, damping: 34 });
      const a2 = animate(opacity, 1, { duration: 0.2 });
      return () => {
        a1.stop();
        a2.stop();
      };
    }
    const a1 = animate(y, 260, { duration: 0.25, ease: [0.7, 0, 0.84, 0] });
    const a2 = animate(opacity, 0, { duration: 0.2 });
    let done = false;
    Promise.all([a1.then(), a2.then()]).then(() => {
      if (done) return;
      done = true;
      safeToRemove?.();
    });
    return () => {
      done = true;
      a1.stop();
      a2.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  // MORPH PROGRESS — the single source of truth for the expanded↔collapsed
  // transition. 0 = full card, 1 = collapsed pill. Height, the layer
  // cross-fade and a subtle squash all derive from it, so the slip reads as
  // ONE component morphing rather than two layers being swapped. A downward
  // drag drives it directly (onCollapseDragMove); otherwise it springs to
  // match the `expanded` prop.
  const collapseP = useMotionValue(expanded ? 0 : 1);
  const draggingRef = useRef(false);
  useEffect(() => {
    if (draggingRef.current) return; // an active drag owns the progress
    const a = animate(collapseP, expanded ? 0 : 1, COLLAPSE_SPRING);
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Bottom-anchored shell height morph — the card's top edge descends toward
  // the navbar as it collapses into the pill (defines layout + clip region).
  const height = useTransform(collapseP, [0, 1], [EXPANDED_H, COLLAPSED_H]);

  // THE SINGLE MORPHING SURFACE — always opaque, so there's never an empty
  // frame. Its height and corner radius reshape continuously between the card
  // and the pill capsule; at collapsed it overlaps the real pill exactly.
  const glassHeight = useTransform(collapseP, [0, 1], [EXPANDED_GLASS_H, COLLAPSED_GLASS_H]);
  const glassRadius = useTransform(collapseP, [0, 1], [EXPANDED_GLASS_RADIUS, COLLAPSED_GLASS_RADIUS]);
  // Card CONTENT fades out over the first part of the collapse (it can't morph
  // into pill content), leaving the bare surface to finish reshaping.
  const cardContentOpacity = useTransform(collapseP, [0, 0.6], [1, 0], { clamp: true });
  // The real pill fades in only at the very end, where the surface has already
  // taken its capsule shape — so the hand-off onto the identical shape is
  // seamless and the collapsed pill still renders unchanged at rest.
  const pillOpacity = useTransform(collapseP, [0.8, 1], [0, 1], { clamp: true });

  // Subtle morph squash (peaks mid-transition, neutral at both ends), composed
  // with the selection-add pulse below onto the same shell scale.
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const morphDeformX = useTransform(collapseP, [0, 0.5, 1], [1, MORPH_DEFORM_X, 1]);
  const morphDeformY = useTransform(collapseP, [0, 0.5, 1], [1, MORPH_DEFORM_Y, 1]);
  const shellScaleX = useTransform(() => scaleX.get() * morphDeformX.get());
  const shellScaleY = useTransform(() => scaleY.get() * morphDeformY.get());

  // SELECTION-ADD PULSE — a subtle squash & stretch each time a new selection
  // lands (count grows). Perturb the scale, then spring back with overshoot so
  // it settles with a liquid wobble. Declared AFTER the morph effect so, in the
  // rare frame where both fire (adding while collapsed → expands + grows), this
  // pulse wins the shared scale values.
  const prevCountRef = useRef(selections.length);
  useEffect(() => {
    const prev = prevCountRef.current;
    prevCountRef.current = selections.length;
    if (selections.length <= prev) return; // only on add, not remove/mount
    scaleX.set(ADD_PULSE_SCALE_X);
    scaleY.set(ADD_PULSE_SCALE_Y);
    const ax = animate(scaleX, 1, { type: 'spring', ...ADD_PULSE_SPRING });
    const ay = animate(scaleY, 1, { type: 'spring', ...ADD_PULSE_SPRING });
    return () => {
      ax.stop();
      ay.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections.length]);

  // Perturb the shell scale then spring it back to rest — the shared squash &
  // stretch used on appear and on collapse.
  const pulseScale = (
    px: number,
    py: number,
    spring: { stiffness: number; damping: number } = PULSE_SPRING,
  ) => {
    scaleX.set(px);
    scaleY.set(py);
    const ax = animate(scaleX, 1, { type: 'spring', ...spring });
    const ay = animate(scaleY, 1, { type: 'spring', ...spring });
    return () => {
      ax.stop();
      ay.stop();
    };
  };

  // APPEAR — a visible stretch when the slip first mounts.
  useEffect(() => {
    return pulseScale(ENTRY_PULSE_SCALE_X, ENTRY_PULSE_SCALE_Y, ENTRY_PULSE_SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // COLLAPSE — subtle squash whenever the slip goes expanded → collapsed
  // (swipe-down, auto-collapse, or after a placed bet).
  const prevExpandedRef = useRef(expanded);
  useEffect(() => {
    const was = prevExpandedRef.current;
    prevExpandedRef.current = expanded;
    if (was && !expanded) {
      return pulseScale(COLLAPSE_PULSE_SCALE_X, COLLAPSE_PULSE_SCALE_Y);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Collapse drag is started manually (dragListener=false) so it never fires
  // from a pointerdown on the swipe thumb or the ×/Lista buttons — those keep
  // their own gestures/taps. Swiping the card body still collapses.
  const dragControls = useDragControls();

  // Swipe-thumb x → drives a purple fill that grows across the track. The
  // drag is constrained by the track element itself, so the confirm gate is
  // "thumb reached the far end" whatever the rendered track width is.
  const swipeX = useMotionValue(0);
  const swipeFill = useTransform(swipeX, (v) => `${50 + v}px`);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLButtonElement>(null);
  // Completed swipe → thumb pins at the end and shows a spinner while the
  // (simulated) ticket creation runs, then onConfirm plays the success flow.
  const [confirming, setConfirming] = useState(false);

  // Max thumb travel: track inner width minus the thumb and its inset.
  const maxThumbX = () => {
    const track = trackRef.current;
    const thumb = thumbRef.current;
    if (!track || !thumb) return Infinity; // unmeasured — never confirm
    return track.clientWidth - thumb.offsetWidth - THUMB_INSET_PX;
  };

  const onCollapseDragStart = () => {
    draggingRef.current = true;
    onKeepAlive();
  };
  // Downward drag drives the collapse morph directly (finger → progress).
  // Upward keeps it expanded (an up-swipe opens the full sheet on release).
  const onCollapseDragMove = (_e: unknown, info: PanInfo) => {
    const p =
      info.offset.y > 0
        ? Math.min(1, info.offset.y / COLLAPSE_DRAG_RANGE_PX)
        : 0;
    collapseP.set(p);
  };
  const handleCollapseDrag = (_e: unknown, info: PanInfo) => {
    draggingRef.current = false;
    // Swipe UP → open the full-screen "Resumen" sheet; settle the morph open.
    if (info.offset.y < -OPEN_LIST_OFFSET_PX || info.velocity.y < -OPEN_LIST_VELOCITY) {
      animate(collapseP, 0, COLLAPSE_SPRING);
      onOpenList();
      return;
    }
    // Swipe DOWN past the threshold → commit. `expanded` flips false and the
    // resting-spring effect finishes the morph from where the finger left off.
    if (info.offset.y > COLLAPSE_OFFSET_PX || info.velocity.y > COLLAPSE_VELOCITY) {
      onCollapse();
      return;
    }
    // Not far enough → cancel: spring the morph back open.
    animate(collapseP, 0, COLLAPSE_SPRING);
  };

  const handleThumbDragEnd = () => {
    const maxX = maxThumbX();
    if (swipeX.get() >= maxX - CONFIRM_END_TOLERANCE_PX) {
      setConfirming(true);
      animate(swipeX, maxX, { type: 'spring', stiffness: 500, damping: 44 });
    } else {
      // Partial swipe — snap back (manual, since dragSnapToOrigin would also
      // yank a completed swipe back to the start).
      animate(swipeX, 0, { type: 'spring', stiffness: 500, damping: 40 });
    }
  };

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(onConfirm, CONFIRM_LOADER_MS);
    return () => clearTimeout(t);
  }, [confirming, onConfirm]);

  // Keep the spinner pinned while the slip is visible behind the green card's
  // reveal; reset once the slip is put away (finishEntryCreated collapses it),
  // so a reused instance (AnimatePresence re-entering an exiting slip) is
  // ready for the next bet.
  useEffect(() => {
    if (expanded || !confirming) return;
    setConfirming(false);
    swipeX.set(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, confirming]);

  return (
    <motion.div
      className="w-full"
      style={{ y, opacity, fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* SHELL — a single element that MORPHS: height, the layer cross-fade
          and a subtle squash are all driven by `collapseP`, so a downward drag
          continuously shrinks the card into the pill (top edge tracks the
          finger; bottom stays anchored). Transparent itself — the glass
          background belongs to the expanded face. */}
      <motion.div
        className="relative w-full overflow-hidden"
        style={{
          height,
          scaleX: shellScaleX,
          scaleY: shellScaleY,
          transformOrigin: 'bottom center',
          // The collapse drag is started manually via dragControls
          // (dragListener=false), so Framer does NOT auto-apply touch-action.
          // Without this the mobile browser scrolls the page and steals the
          // downward swipe. `none` when expanded lets the drag grab the gesture;
          // `auto` when collapsed so the tiny pill never blocks page scroll.
          touchAction: expanded ? 'none' : 'auto',
        }}
        drag={expanded ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={DRAG_ELASTIC}
        onDragStart={onCollapseDragStart}
        onDrag={onCollapseDragMove}
        onDragEnd={handleCollapseDrag}
        onPointerDown={(e) => {
          // Start collapse-drag only from the card body — not the swipe thumb
          // or the ×/Lista buttons (they own their gestures/taps).
          if (!expanded) return;
          if ((e.target as HTMLElement).closest('button')) return;
          dragControls.start(e);
        }}
      >
        {/* THE MORPHING SURFACE — one persistent, always-opaque glass element
            that reshapes (height + corner radius) between the card and the
            pill capsule. Bottom-anchored + inset-x-4 so at collapsed it
            overlaps the real pill exactly; never fades out, so there is no
            empty frame during the transition. */}
        <motion.div
          className="absolute inset-x-4 bottom-2 border border-[#4b20ff]"
          style={{
            backgroundImage: GLASS_BG,
            height: glassHeight,
            borderRadius: glassRadius,
          }}
          aria-hidden
        />

        {/* ---------- COLLAPSED: the real pill (fades in over the identical
             capsule the surface has already morphed into) ---------- */}
        <motion.div
          className="absolute inset-x-0 bottom-0 cursor-pointer"
          style={{
            opacity: pillOpacity,
            pointerEvents: expanded ? 'none' : 'auto',
          }}
          aria-hidden={expanded}
          onClick={expanded ? undefined : onExpand}
          role={expanded ? undefined : 'button'}
          tabIndex={expanded ? undefined : 0}
        >
          <ButtonPreviewMomios
            selectionCount={selections.length}
            cumulativeOdds={cumulativeOdds}
            speedScale={1}
            tier3OddsEffect={buttonProgressionConfig.tier3OddsEffect}
          />
        </motion.div>

        {/* ---------- EXPANDED: full slip content (over the surface) ---------- */}
        <motion.div
          className="absolute inset-x-4 top-0 flex flex-col"
          style={{
            opacity: cardContentOpacity,
            pointerEvents: expanded ? 'auto' : 'none',
          }}
          aria-hidden={!expanded}
        >
          {isParlay ? (
            <>
              {/* PARLAY HEADER — count · handle · tabs. */}
              <div className="flex w-full items-start justify-between px-3 pt-2">
                <div className="flex min-w-px flex-1 items-center gap-1">
                  <div className="flex h-5 min-w-[20px] items-center justify-center rounded-[14px] bg-[rgba(251,251,251,0.16)] px-1">
                    <span className="text-[13px] font-bold leading-4 text-[#f0f2f4]">
                      {selections.length}
                    </span>
                  </div>
                  <span className="text-[13px] font-bold leading-4 text-[#fbfbfb]">
                    Bets
                  </span>
                </div>
                <div className="mt-1 h-1 w-8 shrink-0 rounded-full bg-[rgba(251,251,251,0.32)]" />
                <div className="flex min-w-px flex-1 items-center justify-end gap-4">
                  <div className="flex items-center gap-1">
                    <img src={promoIcon} alt="" className="size-4" />
                    <span className="whitespace-nowrap text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                      Promos
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenList}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 active:opacity-70"
                  >
                    <img src={menuIcon} alt="" className="size-3" />
                    <span className="whitespace-nowrap text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                      Lista
                    </span>
                  </button>
                </div>
              </div>

              {/* PARLAY SELECTIONS — horizontal, latest first, scrolls. */}
              <div className="flex w-full items-center overflow-x-auto px-[10px] pb-3 pt-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {orderedSelections.map((sel) => (
                  <div
                    key={sel.id}
                    // Whole selection capped at 202px; long market/selection
                    // text truncates with "…" inside it, odds stay visible.
                    className="flex max-w-[202px] shrink-0 items-center gap-1 border-r border-[rgba(251,251,251,0.16)] pr-[10px] [&:not(:first-child)]:pl-[6px]"
                  >
                    <button
                      type="button"
                      aria-label="Quitar selección"
                      onClick={() => onRemove(sel.id)}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full p-[2px] active:scale-95"
                    >
                      <img src={closeIcon} alt="" className="size-3" />
                    </button>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <div className="size-9 shrink-0 backdrop-blur-[2px]">
                          <img
                            src={shieldIcon}
                            alt=""
                            className="size-full object-contain p-[3px]"
                          />
                        </div>
                        <div className="flex h-[37px] min-w-0 flex-1 flex-col justify-center">
                          <p className="truncate text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                            {sel.market}
                          </p>
                          <p className="truncate text-[14px] font-medium leading-[21px] text-[#fbfbfb]">
                            {sel.pick}
                          </p>
                        </div>
                      </div>
                      {/* Odds — always visible (never cropped). */}
                      <span className="shrink-0 whitespace-nowrap text-right text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                        {fmtOdds(sel.odds)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* STRAIGHT-BET HANDLE. */}
              <div className="flex items-center justify-center p-3">
                <div className="h-1 w-8 rounded-full bg-[rgba(251,251,251,0.32)]" />
              </div>
              {/* STRAIGHT-BET SELECTION — single stacked row. */}
              <div className="flex flex-col gap-1 px-[10px] pb-3 pt-[10px]">
                {selections.map((sel) => (
                  <div key={sel.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Quitar selección"
                      onClick={() => onRemove(sel.id)}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      className="flex size-5 shrink-0 items-center justify-center rounded-full p-[2px] active:scale-95"
                    >
                      <img src={closeIcon} alt="" className="size-3" />
                    </button>
                    <div className="flex min-w-px flex-1 items-center gap-1">
                      <div className="size-9 shrink-0 backdrop-blur-[2px]">
                        <img
                          src={shieldIcon}
                          alt=""
                          className="size-full object-contain p-[3px]"
                        />
                      </div>
                      <div className="flex min-w-px flex-col justify-center">
                        <p className="max-w-[162px] truncate text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                          {sel.market}
                        </p>
                        <p className="truncate text-[14px] font-bold leading-[21px] text-[#fbfbfb]">
                          {sel.pick}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-[92px] shrink-0 flex-col justify-center text-right text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                      <span className="truncate">Hoy 18:00</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Divider */}
          <div className="h-px w-full bg-[rgba(251,251,251,0.1)]" />

          {/* Entry info — Monto / Momio / Ganancia */}
          <div className="flex w-full items-center gap-3 px-[10px] pt-[10px]">
            <div className="flex min-w-px flex-1 flex-col items-center justify-center">
              <div className="flex items-center gap-1">
                <img src={editIcon} alt="" className="size-3" />
                <p className="text-[14px] font-black leading-[21px] text-[#fbfbfb]">
                  ${STAKE}
                </p>
              </div>
              <p className="text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                Monto
              </p>
            </div>
            <div className="flex min-w-px flex-1 flex-col items-center justify-center">
              <p className="text-[14px] font-black leading-[21px] text-[#fbfbfb]">
                {fmtOdds(cumulativeOdds)}
              </p>
              <p className="text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                Momio
              </p>
            </div>
            <div className="flex min-w-px flex-1 flex-col items-center justify-center">
              <p className="text-[14px] font-black leading-[21px] text-[#fbbf24]">
                ${potentialWin}
              </p>
              <p className="text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                Ganancia
              </p>
            </div>
          </div>

          {/* Swipe to confirm */}
          <div className="flex w-full flex-col px-[10px] pb-[10px] pt-2">
            <div
              ref={trackRef}
              className="relative flex h-10 w-full items-center overflow-hidden rounded-full bg-[rgba(240,242,244,0.12)] py-[2px] pl-[2px] pr-6"
            >
              {/* Purple fill — grows with the thumb as the user swipes. */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-[2px] top-[2px] h-9 rounded-full"
                style={{ width: swipeFill, backgroundImage: PURPLE_CTA }}
              />
              <motion.button
                ref={thumbRef}
                type="button"
                aria-label={
                  confirming
                    ? 'Creando entrada'
                    : `Desliza para jugar por $${STAKE}`
                }
                className="absolute left-[2px] top-[2px] z-10 flex h-9 w-12 items-center justify-center rounded-full"
                style={{ x: swipeX, backgroundImage: PURPLE_CTA }}
                drag={confirming ? false : 'x'}
                dragConstraints={trackRef}
                dragElastic={0.12}
                dragMomentum={false}
                onDragStart={onKeepAlive}
                onDragEnd={handleThumbDragEnd}
                whileTap={confirming ? undefined : { scale: 0.97 }}
              >
                {confirming ? (
                  <span
                    aria-hidden
                    className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
                  />
                ) : (
                  <img
                    src={chevronRightIcon}
                    alt=""
                    className="pointer-events-none size-5"
                  />
                )}
              </motion.button>
              <p className="w-full text-center text-[13px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                Desliza para jugar por: ${STAKE}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
