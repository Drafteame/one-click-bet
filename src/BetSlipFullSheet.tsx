import {
  animate,
  motion,
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
import type { Selection } from './types';

/**
 * BetSlipFullSheet — the full-screen "Resumen de tu entrada" bottom sheet.
 *
 * Opened from the parlay slip's "Lista" tab. Built from Figma node
 * 33304:83122. Slides up over the whole phone frame; swiping it down or
 * pressing × closes it AND collapses the underlying bet slip (onClose).
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
const CONFIRM_OFFSET_PX = 160;

const SHEET_BG = 'linear-gradient(to bottom, #191919 0%, #0f0f0f 100%)';
const GLOW_BG = 'linear-gradient(26.6deg, #4b20ff 0%, #9730ff 100%)';
const PURPLE_CTA = 'linear-gradient(75deg, #4b20ff 0%, #9730ff 100%)';

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
  const handleThumbDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > CONFIRM_OFFSET_PX) onConfirm();
  };

  return (
    <div
      className="absolute inset-0 z-50"
      style={{ fontFamily: "'Red Hat Display', sans-serif" }}
    >
      {/* Dim backdrop revealed as the sheet slides. */}
      <motion.div
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        aria-hidden
      />

      {/* SHEET — slides via `y`; drag down to close. */}
      <motion.div
        className="absolute inset-x-0 bottom-0 top-2 flex flex-col overflow-hidden rounded-t-[28px]"
        style={{ y, backgroundImage: SHEET_BG }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={handleSheetDragEnd}
      >
        {/* Purple glow, top edge. */}
        <div
          className="pointer-events-none absolute left-0 top-0 h-[50px] w-full blur-[50px]"
          style={{ backgroundImage: GLOW_BG }}
          aria-hidden
        />

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

        {/* CONTENT — scrollable selections (stops drag so it scrolls). */}
        <div
          className="relative min-h-px flex-1 overflow-y-auto"
          onPointerDownCapture={(e) => e.stopPropagation()}
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
          {/* bottom fade */}
          <div className="pointer-events-none sticky bottom-0 left-0 h-12 w-full bg-gradient-to-b from-transparent to-[#131313]" />
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

          {/* Swipe to play */}
          <div className="relative flex h-[60px] w-full items-center overflow-hidden rounded-full bg-[rgba(240,242,244,0.12)] py-1 pl-1 pr-6">
            <motion.button
              type="button"
              aria-label={`Desliza para jugar por $${STAKE}`}
              className="absolute left-1 top-1/2 z-10 flex size-[52px] -translate-y-1/2 items-center justify-center rounded-full"
              style={{ backgroundImage: PURPLE_CTA }}
              drag="x"
              dragConstraints={{ left: 0, right: 240 }}
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
            <p className="w-full text-center text-[16px] font-medium leading-6 text-[#f0f2f4]">
              Desliza para jugar por ${STAKE}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
