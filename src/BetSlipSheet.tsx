import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  usePresence,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { useEffect, useRef } from 'react';
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
const EXPANDED_H = 195; // straight/parlay card footprint

// Drag thresholds.
const COLLAPSE_OFFSET_PX = 64;
const COLLAPSE_VELOCITY = 450;
const CONFIRM_OFFSET_PX = 140;

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

  // SQUASH & STRETCH — a brief scale pulse on each morph. Expanding stretches
  // the shell taller/narrower; collapsing squashes it shorter/wider. Anchored
  // at the bottom so it grows/shrinks from the navbar edge. Skipped on the
  // first render (that's the entry slide, not a morph).
  const scaleX = useMotionValue(1);
  const scaleY = useMotionValue(1);
  const firstRenderRef = useRef(true);
  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const ax = animate(scaleX, [1, expanded ? 0.97 : 1.03, 1], {
      duration: 0.42,
      ease: 'easeOut',
    });
    const ay = animate(scaleY, [1, expanded ? 1.06 : 0.95, 1], {
      duration: 0.42,
      ease: 'easeOut',
    });
    return () => {
      ax.stop();
      ay.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Collapse drag is started manually (dragListener=false) so it never fires
  // from a pointerdown on the swipe thumb or the ×/Lista buttons — those keep
  // their own gestures/taps. Swiping the card body still collapses.
  const dragControls = useDragControls();

  // Swipe-thumb x → drives a purple fill that grows across the track.
  const swipeX = useMotionValue(0);
  const swipeFill = useTransform(swipeX, (v) => `${50 + v}px`);

  const handleCollapseDrag = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > COLLAPSE_OFFSET_PX || info.velocity.y > COLLAPSE_VELOCITY) {
      onCollapse();
    }
  };

  const handleThumbDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > CONFIRM_OFFSET_PX) onConfirm();
  };

  return (
    <motion.div
      className="w-full"
      style={{ y, opacity, fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* SHELL — morphs height (+ squash/stretch). Transparent itself: the
          glass background belongs to the expanded layer, so a collapsed shell
          shows only the ButtonPreviewMomios pill. */}
      <motion.div
        className="relative w-full overflow-hidden"
        style={{ scaleX, scaleY, transformOrigin: 'bottom center' }}
        animate={{ height: expanded ? EXPANDED_H : COLLAPSED_H }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        drag={expanded ? 'y' : false}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleCollapseDrag}
        onPointerDown={(e) => {
          // Start collapse-drag only from the card body — not the swipe thumb
          // or the ×/Lista buttons (they own their gestures/taps).
          if (!expanded) return;
          if ((e.target as HTMLElement).closest('button')) return;
          dragControls.start(e);
        }}
      >
        {/* Expanded glass background — fades in as the shell grows. */}
        <motion.div
          className="absolute inset-x-4 inset-y-0 rounded-[20px] border border-[#4b20ff]"
          style={{ backgroundImage: GLASS_BG }}
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          aria-hidden
        />

        {/* ---------- COLLAPSED: the existing pill (unchanged) ---------- */}
        <motion.div
          className="absolute inset-x-0 bottom-0 cursor-pointer"
          animate={{ opacity: expanded ? 0 : 1 }}
          transition={{ duration: 0.16 }}
          style={{ pointerEvents: expanded ? 'none' : 'auto' }}
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

        {/* ---------- EXPANDED: full slip (over the glass) ---------- */}
        <motion.div
          className="absolute inset-x-4 top-0 flex flex-col"
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.18 }}
          style={{ pointerEvents: expanded ? 'auto' : 'none' }}
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
            <div className="relative flex h-10 w-full items-center overflow-hidden rounded-full bg-[rgba(240,242,244,0.12)] py-[2px] pl-[2px] pr-6">
              {/* Purple fill — grows with the thumb as the user swipes. */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-[2px] top-[2px] h-9 rounded-full"
                style={{ width: swipeFill, backgroundImage: PURPLE_CTA }}
              />
              <motion.button
                type="button"
                aria-label={`Desliza para jugar por $${STAKE}`}
                className="absolute left-[2px] top-[2px] z-10 flex h-9 w-12 items-center justify-center rounded-full"
                style={{ x: swipeX, backgroundImage: PURPLE_CTA }}
                drag="x"
                dragConstraints={{ left: 0, right: 220 }}
                dragElastic={0.12}
                dragSnapToOrigin
                onDragStart={onKeepAlive}
                onDragEnd={handleThumbDragEnd}
                whileTap={{ scale: 0.97 }}
              >
                <img
                  src={chevronRightIcon}
                  alt=""
                  className="pointer-events-none size-5"
                />
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
