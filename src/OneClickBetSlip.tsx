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
 * OneClickBetSlip — semi-expanded bet slip.
 *
 * Built from the Figma "one click bet slip" component
 * (Draftea-Global, node 33271:82235). Lets the user review their
 * selection(s) and place the bet directly (swipe-to-confirm) without
 * navigating to the full-screen slip.
 *
 * Interaction:
 *   - Swipe DOWN (drag the card, or the handle) → onCollapse() → the app
 *     returns to the existing collapsed pill (ButtonPreviewMomios).
 *   - Swipe the purple thumb RIGHT → onConfirm() → places the bet.
 *   - Tap the × on a selection row → onRemove(id).
 *
 * Design tokens (verbatim from Figma):
 *   card bg      linear-gradient(64.6deg, #14083d, #230c3e)
 *   card border  #4b20ff
 *   handle       rgba(251,251,251,0.32)
 *   text 1/2/3   #fbfbfb / rgba(251,251,251,0.7) / rgba(251,251,251,0.5)
 *   earned/gold  #fbbf24
 *   swipe track  rgba(240,242,244,0.12)
 *   thumb        linear-gradient(70.5deg, #4b20ff, #9730ff)
 *   font         Red Hat Display (Medium 500 / Bold 700 / Black 900)
 *
 * Assets: chevron_right.svg, close.svg, edit.svg (uploaded) + shield.svg
 * (existing, used as the team/player placeholder — Figma "player&TeamPlaceholder").
 */

// Fixed demo stake — matches the collapsed pill (ButtonPreviewMomios `stake`).
const STAKE = 200;
const fmtOdds = (n: number) => `${n.toFixed(2)}x`;

// Drag thresholds.
const COLLAPSE_OFFSET_PX = 72; // pull-down distance that triggers collapse
const COLLAPSE_VELOCITY = 500; // …or a fast downward flick
const CONFIRM_OFFSET_PX = 140; // rightward swipe distance that places the bet

type Props = {
  selections: Selection[];
  cumulativeOdds: number;
  /** Remove a single selection (× on its row). */
  onRemove: (id: string) => void;
  /** Collapse back to the pill (swipe down / handle). */
  onCollapse: () => void;
  /** Place the bet (swipe-to-confirm thumb reaches the end). */
  onConfirm: () => void;
};

export function OneClickBetSlip({
  selections,
  cumulativeOdds,
  onRemove,
  onCollapse,
  onConfirm,
}: Props) {
  const potentialWin = Math.round(cumulativeOdds * STAKE);

  // 2+ selections = parlay → horizontal, latest-first layout with a header.
  // 1 selection = straight bet → the original single stacked row.
  const isParlay = selections.length >= 2;
  // Latest selection first (newest is appended last, so reverse for display).
  const orderedSelections = [...selections].reverse();

  // Entry/exit slide driven imperatively (mirrors BetSlipShell). The
  // declarative initial/animate path gets stranded at `initial` under
  // React 18 StrictMode's double-mount, so we animate motion values by hand.
  const [isPresent, safeToRemove] = usePresence();
  const y = useMotionValue(260); // starts below the fold (> card height)
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
    // Marked for removal → slide down + fade, then release.
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

  const handleCardDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > COLLAPSE_OFFSET_PX || info.velocity.y > COLLAPSE_VELOCITY) {
      onCollapse();
    }
  };

  const handleThumbDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > CONFIRM_OFFSET_PX) onConfirm();
  };

  return (
    // OUTER — entry/exit slide (imperative motion values above). Keeps `y`
    // free for the inner drag: a single element can't both be animated and
    // dragged on `y` (drag takes ownership of the motion value).
    <motion.div
      className="w-full px-4"
      style={{ y, opacity, fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* INNER — the card. Swipe DOWN to collapse: elastic downward pull,
          releases back to rest unless it passes the collapse threshold. */}
      <motion.div
        className="flex w-full flex-col overflow-hidden rounded-[20px] border border-[#4b20ff]"
        style={{
          backgroundImage:
            'linear-gradient(64.6deg, #14083d 0%, #230c3e 100%)',
        }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.6 }}
        onDragEnd={handleCardDragEnd}
      >
        {isParlay ? (
          <>
            {/* PARLAY HEADER — count badge · drag handle · tabs. pt-2 (not
                pt-3) so the header block matches the straight-bet handle's
                height, keeping the overall card the same size for a parlay. */}
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
              {/* Drag affordance for swipe-to-collapse. */}
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

            {/* PARLAY SELECTIONS — horizontal, latest first, scrolls sideways. */}
            <div className="flex w-full items-center overflow-x-auto px-[10px] pb-3 pt-[10px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {orderedSelections.map((sel) => (
                <div
                  key={sel.id}
                  className="flex shrink-0 items-center gap-1 border-r border-[rgba(251,251,251,0.16)] pr-[10px] [&:not(:first-child)]:pl-[6px]"
                >
                  {/* Remove (×) */}
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
            {/* STRAIGHT-BET HANDLE — drag affordance for swipe-to-collapse. */}
            <div className="flex items-center justify-center p-3">
              <div className="h-1 w-8 rounded-full bg-[rgba(251,251,251,0.32)]" />
            </div>

            {/* STRAIGHT-BET SELECTION — single stacked row. */}
            <div className="flex flex-col gap-1 px-[10px] pb-3 pt-[10px]">
              {selections.map((sel) => (
                <div key={sel.id} className="flex items-center gap-1">
                  {/* Remove (×) */}
                  <button
                    type="button"
                    aria-label="Quitar selección"
                    onClick={() => onRemove(sel.id)}
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    className="flex size-5 shrink-0 items-center justify-center rounded-full p-[2px] transition-opacity hover:opacity-100 active:scale-95"
                  >
                    <img src={closeIcon} alt="" className="size-3" />
                  </button>

                  {/* Placeholder + selection text */}
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

                  {/* Time / date (mock — the app has no per-pick kickoff data) */}
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
          {/* Monto */}
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

          {/* Momio */}
          <div className="flex min-w-px flex-1 flex-col items-center justify-center">
            <p className="text-[14px] font-black leading-[21px] text-[#fbfbfb]">
              {fmtOdds(cumulativeOdds)}
            </p>
            <p className="text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
              Momio
            </p>
          </div>

          {/* Ganancia */}
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
            {/* Draggable thumb — swipe right to place the bet. */}
            <motion.button
              type="button"
              aria-label={`Desliza para jugar por $${STAKE}`}
              className="absolute left-[2px] top-1/2 z-10 flex h-9 w-12 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                backgroundImage:
                  'linear-gradient(70.5deg, #4b20ff 0%, #9730ff 100%)',
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 220 }}
              dragElastic={0.12}
              dragSnapToOrigin
              onDragEnd={handleThumbDragEnd}
              onPointerDownCapture={(e) => e.stopPropagation()}
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
  );
}
