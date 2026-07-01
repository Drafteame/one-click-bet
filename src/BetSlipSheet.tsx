import {
  animate,
  motion,
  useMotionValue,
  usePresence,
  type PanInfo,
} from 'framer-motion';
import { useEffect } from 'react';
import chevronRightIcon from './assets/chevron_right.svg';
import closeIcon from './assets/close.svg';
import editIcon from './assets/edit.svg';
import menuIcon from './assets/menu.svg';
import promoIcon from './assets/promo.png';
import shieldIcon from './assets/shield.svg';
import type { Selection } from './types';

/**
 * BetSlipSheet — the one-click bet slip, as a single morphing container.
 *
 * There is only ever ONE bet-slip element on screen. A single "glass" shell
 * (purple gradient + #4b20ff border) morphs between two variants by animating
 * its height + corner radius while the two content sets cross-fade — a
 * Liquid-Glass-style morph rather than a hide/show of two components:
 *
 *   - COLLAPSED → a compact pill: count · Momio · Monto · Gana CTA.
 *   - EXPANDED  → the full slip: selection(s) + Monto/Momio/Ganancia +
 *                 swipe-to-confirm. 1 selection = straight bet; 2+ = parlay
 *                 (header + horizontal, latest-first selections).
 *
 * Interaction:
 *   - Tap the collapsed pill        → onExpand()
 *   - Swipe the expanded card DOWN  → onCollapse() (morphs back to the pill)
 *   - Swipe the purple thumb RIGHT  → onConfirm() (places the bet)
 *   - Tap × on a selection          → onRemove(id)
 *   - Touching the swipe thumb       → onKeepAlive() (defers auto-collapse)
 *
 * The mount/unmount slide (when selections cross 0↔1) is driven imperatively
 * on the OUTER wrapper (mirrors BetSlipShell); the morph is the shell's own
 * height/radius animation. Both are kept on separate elements so drag,
 * morph, and slide never fight over the same motion value.
 *
 * Assets: close/edit/chevron_right/menu (uploaded) + promo.png + shield.svg.
 */

const STAKE = 200; // fixed demo stake
const fmtOdds = (n: number) => `${n.toFixed(2)}x`;

// Morph geometry.
const COLLAPSED_H = 56;
const EXPANDED_H = 195; // matches the straight/parlay card footprint
const COLLAPSED_RADIUS = 28;
const EXPANDED_RADIUS = 20;

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
}: Props) {
  const potentialWin = Math.round(cumulativeOdds * STAKE);
  const isParlay = selections.length >= 2;
  // Latest selection first (newest is appended last, so reverse for display).
  const orderedSelections = [...selections].reverse();

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
      className="w-full px-4"
      style={{ y, opacity, fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* GLASS SHELL — morphs height + radius; content cross-fades inside. */}
      <motion.div
        className="relative w-full overflow-hidden border border-[#4b20ff]"
        style={{ backgroundImage: GLASS_BG }}
        animate={{
          height: expanded ? EXPANDED_H : COLLAPSED_H,
          borderRadius: expanded ? EXPANDED_RADIUS : COLLAPSED_RADIUS,
        }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        drag={expanded ? 'y' : false}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleCollapseDrag}
        onClick={expanded ? undefined : onExpand}
        role={expanded ? undefined : 'button'}
        tabIndex={expanded ? undefined : 0}
      >
        {/* ---------- COLLAPSED: summary pill ---------- */}
        <motion.div
          className="absolute inset-0 flex cursor-pointer items-center gap-3 px-3"
          animate={{ opacity: expanded ? 0 : 1 }}
          transition={{ duration: 0.16 }}
          style={{ pointerEvents: expanded ? 'none' : 'auto' }}
          aria-hidden={expanded}
        >
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex h-5 min-w-[20px] items-center justify-center rounded-[14px] bg-[rgba(251,251,251,0.16)] px-1">
              <span className="text-[13px] font-bold leading-4 text-[#f0f2f4]">
                {selections.length}
              </span>
            </div>
            <span className="text-[13px] font-bold leading-4 text-[#fbfbfb]">
              Bets
            </span>
          </div>
          <div className="flex min-w-px flex-1 items-center justify-center gap-5">
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-black leading-[18px] text-[#fbfbfb]">
                {fmtOdds(cumulativeOdds)}
              </span>
              <span className="text-[11px] font-medium leading-[13px] text-[rgba(251,251,251,0.5)]">
                Momio
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[14px] font-black leading-[18px] text-[#fbfbfb]">
                ${STAKE}
              </span>
              <span className="text-[11px] font-medium leading-[13px] text-[rgba(251,251,251,0.5)]">
                Monto
              </span>
            </div>
          </div>
          <div
            className="flex shrink-0 items-center gap-1 rounded-full py-1.5 pl-3 pr-2"
            style={{ backgroundImage: PURPLE_CTA }}
          >
            <div className="flex flex-col items-start">
              <span className="text-[14px] font-black leading-[18px] text-white">
                ${potentialWin}
              </span>
              <span className="text-[11px] font-medium leading-[13px] text-white/70">
                Gana
              </span>
            </div>
            <img src={chevronRightIcon} alt="" className="size-4" />
          </div>
        </motion.div>

        {/* ---------- EXPANDED: full slip ---------- */}
        <motion.div
          className="absolute inset-x-0 top-0 flex flex-col"
          animate={{ opacity: expanded ? 1 : 0 }}
          transition={{ duration: 0.16 }}
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
                  <div className="flex items-center gap-1">
                    <img src={menuIcon} alt="" className="size-3" />
                    <span className="whitespace-nowrap text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                      Lista
                    </span>
                  </div>
                </div>
              </div>

              {/* PARLAY SELECTIONS — horizontal, latest first, scrolls. */}
              <div className="flex w-full items-center overflow-x-auto px-[10px] pb-3 pt-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {orderedSelections.map((sel) => (
                  <div
                    key={sel.id}
                    className="flex shrink-0 items-center gap-1 border-r border-[rgba(251,251,251,0.16)] pr-[10px] [&:not(:first-child)]:pl-[6px]"
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
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <div className="size-9 shrink-0 backdrop-blur-[2px]">
                          <img
                            src={shieldIcon}
                            alt=""
                            className="size-full object-contain p-[3px]"
                          />
                        </div>
                        <div className="flex h-[37px] flex-col justify-center">
                          <p className="max-w-[162px] truncate text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
                            {sel.match}
                          </p>
                          <p className="whitespace-nowrap text-[14px] font-medium leading-[21px] text-[#fbfbfb]">
                            {sel.pick}
                          </p>
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-right text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]">
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
                          {sel.match}
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
              <motion.button
                type="button"
                aria-label={`Desliza para jugar por $${STAKE}`}
                className="absolute left-[2px] top-1/2 z-10 flex h-9 w-12 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ backgroundImage: PURPLE_CTA }}
                drag="x"
                dragConstraints={{ left: 0, right: 220 }}
                dragElastic={0.12}
                dragSnapToOrigin
                onDragStart={onKeepAlive}
                onDragEnd={handleThumbDragEnd}
                onPointerDownCapture={(e) => {
                  e.stopPropagation();
                  onKeepAlive();
                }}
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
