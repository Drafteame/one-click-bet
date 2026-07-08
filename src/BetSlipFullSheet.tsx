import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  usePresence,
  type PanInfo,
} from 'framer-motion';
import { useEffect } from 'react';
import boosterIllus from './assets/booster.png';
import chevronRightIcon from './assets/chevron_right.svg';
import clockIcon from './assets/clock.svg';
import closeIcon from './assets/close.svg';
import editIcon from './assets/edit.svg';
import freebetIllus from './assets/freebet.png';
import shieldIcon from './assets/shield.svg';
import trashIcon from './assets/trash.svg';
import { SwipeToConfirm } from './SwipeToConfirm';
import type { Selection } from './types';

/**
 * BetSlipFullSheet — the "Resumen de tu entrada" floating card.
 *
 * Opened from the parlay slip's "Lista" tab. A bottom-anchored floating card
 * (all corners rounded) over a dimming overlay — NOT an edge-to-edge sheet.
 * It sits at the navbar's height and grows/shrinks with the number of
 * selections, capped so its top always stops below the app header (the header
 * stays visible). Once the cap is hit the selections list scrolls internally.
 * Slides up over the phone frame; swiping it down or pressing × closes it AND
 * collapses the underlying bet slip (onClose).
 *
 * Includes: header (delete-all trash + × + count + balance), scrollable
 * selections list, Monto/Momio/Ganancia footer, the free-bet/Booster promos
 * box, the "accept odds changes" checkbox, and swipe-to-play. Toggle switches
 * and the checkbox are CSS controls. STILL PENDING one asset: the countdown
 * clock icon — the countdown pills currently show the time text without it.
 *
 * Assets: close.svg (× + per-row remove), shield.svg (team placeholder),
 * edit.svg (Monto), chevron_right.svg (swipe thumb + Booster caret),
 * trash.svg (delete-all), freebet.png / booster.png (promo illustrations).
 */

const STAKE = 200;
const fmtOdds = (n: number) => `${n.toFixed(2)}x`;

const CLOSE_OFFSET_PX = 120;
const CLOSE_VELOCITY = 550;
// Top inset of the floating card's max height — the app header (sticky topbar,
// ~88px on the 390×844 mockup) must stay visible, so the card can never grow
// past this line. Only bounds the MAX height; small slips stay bottom-anchored.
const TOP_INSET_PX = 96;
// Bottom gap so the card's lower edge lines up with the navbar (which sits
// pb-4 = 16px above the safe-area inset).
const BOTTOM_GAP_PX = 16;
// Overlay stays transparent across this top band (the ~88px app header) so the
// header is never dimmed, then ramps to full scrim just below it.
const HEADER_UNDIM_PX = 88;

const SHEET_BG = 'linear-gradient(to bottom, #191919 0%, #0f0f0f 100%)';

type Props = {
  selections: Selection[];
  cumulativeOdds: number;
  onRemove: (id: string) => void;
  /** Delete-all (trash) — clears the whole slip. */
  onClearAll: () => void;
  /** Swipe-down or × — closes the sheet and collapses the bet slip. */
  onClose: () => void;
  /** Swipe-to-play — places the bet. */
  onConfirm: () => void;
};

export function BetSlipFullSheet({
  selections,
  cumulativeOdds,
  onRemove,
  onClearAll,
  onClose,
  onConfirm,
}: Props) {
  const potentialWin = Math.round(cumulativeOdds * STAKE);
  const orderedSelections = [...selections].reverse(); // latest first

  // Slide up on mount / down on unmount (imperative — mirrors BetSlipShell).
  const [isPresent, safeToRemove] = usePresence();
  const y = useMotionValue(900);
  useEffect(() => {
    if (isPresent) {
      const a = animate(y, 0, { type: 'spring', stiffness: 360, damping: 38 });
      return () => a.stop();
    }
    const a = animate(y, 900, { duration: 0.28, ease: [0.7, 0, 0.84, 0] });
    let done = false;
    a.then(() => {
      if (done) return;
      done = true;
      safeToRemove?.();
    });
    return () => {
      done = true;
      a.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPresent]);

  const handleSheetDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_OFFSET_PX || info.velocity.y > CLOSE_VELOCITY) {
      onClose();
    }
  };
  // Close-drag is started manually so it never fires from the scrollable
  // list, the swipe thumb, or the header buttons — only the sheet chrome.
  const dragControls = useDragControls();

  return (
    <div
      className="absolute inset-0 z-50"
      style={{ fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* Dim backdrop — covers the navbar + feed behind the floating card, but
          FADES to transparent across the app-header band (top ~88px) so the
          header is never dimmed while the card is open. */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) ${HEADER_UNDIM_PX}px, rgba(0,0,0,0.7) ${HEADER_UNDIM_PX + 20}px, rgba(0,0,0,0.7) 100%)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
      />

      {/* POSITIONING FRAME — bottom-anchored between the header cap and the
          navbar line; the card is pushed to the bottom (justify-end) and grows
          upward as selections are added, never past TOP_INSET_PX. */}
      <div
        className="absolute left-4 right-4 flex flex-col justify-end"
        style={{
          top: TOP_INSET_PX,
          bottom: 0,
          paddingBottom: `calc(env(safe-area-inset-bottom) + ${BOTTOM_GAP_PX}px)`,
        }}
      >
      {/* FLOATING CARD — content-height, capped at the frame (max-h-full);
          slides via `y`; drag down to close. */}
      <motion.div
        className="flex max-h-full w-full flex-col overflow-hidden rounded-[28px] border border-[rgba(251,251,251,0.12)]"
        style={{ y, backgroundImage: SHEET_BG }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleSheetDragEnd}
        onPointerDown={(e) => {
          // Close-drag only from sheet chrome — not the scroll list, thumb,
          // or buttons (they keep their own scroll/gesture/tap).
          const el = e.target as HTMLElement;
          if (el.closest('button') || el.closest('[data-scroll]')) return;
          dragControls.start(e);
        }}
      >
        {/* HANDLE — same grabber as the summarized slip; signals swipe-down to
            close. Part of the drag-to-close chrome (not a button/scroll area). */}
        <div className="flex shrink-0 items-center justify-center px-3 pt-3 pb-2">
          <div className="h-1 w-8 rounded-full bg-[rgba(251,251,251,0.32)]" />
        </div>

        {/* HEADER — (delete-all trash omitted) · title + count · × */}
        <div className="relative flex h-14 shrink-0 items-center border-b border-[rgba(240,242,244,0.08)]">
          {/* Delete-all (trash). */}
          <div className="flex w-12 shrink-0 pl-1">
            <button
              type="button"
              aria-label="Vaciar entrada"
              onClick={onClearAll}
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="flex size-10 items-center justify-center rounded-full active:scale-95"
            >
              <img src={trashIcon} alt="" className="size-5" />
            </button>
          </div>
          <div className="flex min-w-px flex-1 flex-col items-center justify-center px-3">
            <div className="flex items-center justify-center gap-1">
              <p className="text-[14px] font-bold leading-[21px] text-[#f0f2f4]">
                Resumen de tu entrada
              </p>
              <div className="flex h-4 min-w-[20px] items-center justify-center rounded-[14px] bg-[rgba(251,251,251,0.16)] px-1">
                <span className="text-[12px] font-bold leading-[18px] text-[#f0f2f4]">
                  {selections.length}
                </span>
              </div>
            </div>
            <p className="w-full text-center text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
              Balance disponible: $250.00
            </p>
          </div>
          <div className="flex w-12 shrink-0 justify-end pr-1">
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              onPointerDownCapture={(e) => e.stopPropagation()}
              className="flex size-10 items-center justify-center rounded-full active:scale-95"
            >
              <img src={closeIcon} alt="" className="size-5" />
            </button>
          </div>
        </div>

        {/* CONTENT — scrollable selections (data-scroll: excluded from the
            sheet close-drag so it scrolls normally). */}
        <div
          data-scroll
          className="relative min-h-px flex-1 overflow-y-auto"
        >
          {orderedSelections.map((sel) => (
            <div key={sel.id} className="flex w-full items-stretch">
              {/* remove × + vertical divider */}
              <div className="flex w-10 shrink-0 items-center justify-end gap-3">
                <button
                  type="button"
                  aria-label="Quitar selección"
                  onClick={() => onRemove(sel.id)}
                  className="flex size-4 items-center justify-center active:scale-90"
                >
                  <img src={closeIcon} alt="" className="size-4" />
                </button>
                <div className="h-10 w-px bg-[rgba(251,251,251,0.16)]" />
              </div>
              {/* team + text */}
              <div className="flex min-w-px flex-1 items-center gap-[6px] px-[6px] py-2">
                <div className="flex size-11 shrink-0 items-center justify-center">
                  <div className="size-9 overflow-hidden rounded-[8px] backdrop-blur-[2px]">
                    <img
                      src={shieldIcon}
                      alt=""
                      className="size-full object-contain p-[3px]"
                    />
                  </div>
                </div>
                <div className="flex min-w-px flex-1 flex-col justify-center">
                  <p className="max-w-[162px] truncate text-[10px] font-bold uppercase leading-[15px] text-[rgba(251,251,251,0.5)]">
                    {sel.market}
                  </p>
                  <p className="truncate text-[14px] font-medium leading-[21px] text-[#fbfbfb]">
                    {sel.pick}
                  </p>
                  <p className="truncate text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                    Hoy 18:00
                  </p>
                </div>
              </div>
              {/* odds */}
              <div className="flex w-[85px] shrink-0 items-center justify-end pl-1 pr-3">
                <span className="text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                  {fmtOdds(sel.odds)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* FOOTER — Monto / Momio / Ganancia + swipe to play. */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[rgba(251,251,251,0.16)] px-[10px] pb-2 pt-[10px]">
          <div className="flex h-[59px] items-center gap-2">
            {/* Monto */}
            <div className="relative flex min-w-px flex-1 flex-col items-center pt-[11px]">
              <div className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-[12px] border border-[rgba(251,251,251,0.16)] p-3">
                <img src={editIcon} alt="" className="size-3.5" />
                <p className="min-w-px flex-1 text-[16px] font-medium leading-6 text-[#fbfbfb]">
                  ${STAKE}
                </p>
              </div>
              <div className="absolute left-2 top-0 flex items-center rounded-[4px] bg-[#121212] px-1.5 py-0.5">
                <span className="text-[14px] font-medium leading-[21px] text-[rgba(251,251,251,0.5)]">
                  Monto
                </span>
              </div>
            </div>
            {/* Momio */}
            <div className="flex min-w-px flex-1 flex-col items-center justify-center py-0.5">
              <span className="text-[14px] font-medium leading-[21px] text-[rgba(251,251,251,0.5)]">
                Momio
              </span>
              <span className="text-[14px] font-black leading-[21px] text-[#fbfbfb]">
                {fmtOdds(cumulativeOdds)}
              </span>
            </div>
            {/* Ganancia */}
            <div className="relative flex min-w-px flex-1 flex-col items-center pt-[11px]">
              <div className="flex h-12 w-full items-center justify-center overflow-hidden rounded-[12px] border border-[rgba(251,251,251,0.12)] p-3">
                <p className="text-[16px] font-bold leading-6 text-[#fbbf24]">
                  ${potentialWin}
                </p>
              </div>
              <div className="absolute left-2 top-0 flex items-center rounded-[4px] bg-[#121212] px-1.5 py-0.5">
                <span className="text-[14px] font-medium leading-[21px] text-[rgba(251,251,251,0.5)]">
                  Ganancia
                </span>
              </div>
            </div>
          </div>

          {/* Promos — free bet + Booster. Toggles are CSS controls; the
              countdown clock glyph is still pending its asset. */}
          <div className="flex flex-col overflow-hidden rounded-[16px] border border-[rgba(251,251,251,0.16)]">
            {/* Free bet (disabled toggle) */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[12px] p-1"
                style={{
                  backgroundImage:
                    'linear-gradient(140.5deg, #f0abfc 0%, #6b47ff 100%)',
                }}
              >
                <img src={freebetIllus} alt="" className="size-7 object-contain" />
              </div>
              <div className="flex min-w-px flex-1 flex-col">
                <span className="text-[14px] font-bold leading-[21px] text-[#fbfbfb]">
                  Apuesta gratis
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex h-5 items-center gap-1 rounded-[12px] bg-[rgba(251,251,251,0.12)] px-1">
                    <img src={clockIcon} alt="" className="size-3" />
                    <span className="text-[12px] font-medium leading-4 text-[#fbfbfb]">
                      29d<span className="text-[rgba(251,251,251,0.7)]">:</span>23h
                    </span>
                  </div>
                  <div className="h-4 w-px bg-[rgba(251,251,251,0.16)]" />
                  <div className="flex items-center gap-1 text-[14px]">
                    <span className="font-medium text-[rgba(251,251,251,0.5)]">
                      Monto:
                    </span>
                    <span className="font-bold text-[rgba(251,251,251,0.7)]">$25</span>
                  </div>
                </div>
              </div>
              {/* toggle — off + disabled */}
              <div className="flex h-8 w-[52px] shrink-0 items-center rounded-full bg-[rgba(251,251,251,0.16)] px-1 opacity-40">
                <div className="size-6 rounded-full bg-white" />
              </div>
            </div>

            <div className="mx-3 h-px bg-[rgba(251,251,251,0.16)]" />

            {/* Booster */}
            <div className="flex items-center gap-2 px-3 py-2">
              <div
                className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-[12px] p-1"
                style={{
                  backgroundImage:
                    'linear-gradient(50deg, #ffa65b 0%, #f0abfc 100%)',
                }}
              >
                <img src={boosterIllus} alt="" className="size-7 object-contain" />
              </div>
              <div className="flex min-w-px flex-1 flex-col">
                <div className="flex items-center gap-0.5">
                  <span className="text-[14px] font-bold leading-[21px] text-[#fbfbfb]">
                    Booster 20%
                  </span>
                  <img
                    src={chevronRightIcon}
                    alt=""
                    className="size-[18px] rotate-90 opacity-70"
                  />
                </div>
                <div className="flex h-5 items-center gap-1 self-start rounded-[12px] bg-[rgba(251,251,251,0.12)] px-1">
                  <img src={clockIcon} alt="" className="size-3" />
                  <span className="text-[12px] font-medium leading-4 text-[#fbfbfb]">
                    23h<span className="text-[rgba(251,251,251,0.7)]">:</span>23m
                    <span className="text-[rgba(251,251,251,0.7)]">:</span>23s
                  </span>
                </div>
              </div>
              {/* toggle — off */}
              <div className="flex h-8 w-[52px] shrink-0 items-center rounded-full bg-[rgba(251,251,251,0.16)] px-1">
                <div className="size-6 rounded-full bg-white" />
              </div>
            </div>
          </div>

          {/* Accept odds changes — CSS checkbox. */}
          <button
            type="button"
            onPointerDownCapture={(e) => e.stopPropagation()}
            className="flex items-center gap-3 px-3.5 active:opacity-70"
          >
            <div className="size-5 shrink-0 rounded-[6px] border-2 border-[rgba(251,251,251,0.3)]" />
            <p className="text-left text-[14px] font-medium leading-[21px] text-[rgba(251,251,251,0.7)]">
              Acepta siempre el cambio de momios.{' '}
              <span className="underline">Más info.</span>
            </p>
          </button>

          {/* Swipe to play — shared component (same as the summarized slip),
              at 44px height. `data-scroll` keeps the sheet close-drag from
              starting here WITHOUT stopping the pointerdown from reaching the
              swipe thumb (which owns the horizontal drag gesture). */}
          <div data-scroll>
            <SwipeToConfirm stake={STAKE} onConfirm={onConfirm} heightPx={44} />
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
