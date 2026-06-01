import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useMemo, useRef, useState } from 'react';
import { BetSlipShell } from './BetSlipShell';
import {
  ButtonPreviewMomios,
  tierForOdds,
  type ButtonLiveState,
} from './ButtonPreviewMomios';
import { buttonProgressionConfig } from './buttonProgressionConfig';
import { HomeScreenChrome, MOCK_PICKS, Navbar } from './HomeScreen';
import type { Selection, Tier } from './types';

/* ============================================================ */
/*  Debug overlay helpers                                        */
/* ============================================================ */
function PhaseBar({ label, value }: { label: string; value: number }) {
  // Render a 0..1 motion phase as a thin progress strip.
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="mt-1 flex items-center gap-2">
      <span className="w-[36px] text-[9px] uppercase tracking-wider text-amber-300/80">
        {label}
      </span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-amber-300/80"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Debug flags from URL                                         */
/* ============================================================ */
function useDebug() {
  return useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === 'true';
  }, []);
}

/* ============================================================ */
/*  Cumulative odds = multiplicative product of selections      */
/* ============================================================ */
function computeCumulativeOdds(selections: Selection[]): number {
  if (selections.length === 0) return 0;
  return selections.reduce((acc, s) => acc * s.odds, 1);
}

/* ============================================================ */
/*  Pre-built selection sets that land cleanly inside each tier  */
/*  Used by the debug jump-to-tier buttons.                      */
/* ============================================================ */
function selectionsForTier(target: Tier): Selection[] {
  // Hand-picked combos so each tier renders with a representative
  // odds value squarely inside its range (no overshoot into the next).
  const byId = (id: string) => MOCK_PICKS.find((p) => p.id === id)!;
  const stamp = (picks: Selection[]) =>
    picks.map((p, i) => ({ ...p, id: `${p.id}-${i}` }));

  switch (target) {
    case 0:
      return [];
    case 1:
      // 2.75x — sits in [2.00, 5.00)
      return stamp([byId('rma-w')]);
    case 2:
      // 2.75 * 3.80 = 10.45x — sits in [5.00, 15.00)
      return stamp([byId('rma-w'), byId('draw')]);
    case 3:
      // 2.75 * 3.80 * 1.95 * 2.10 ≈ 42.8x — comfortably > 15.00
      return stamp([byId('rma-w'), byId('draw'), byId('lewa'), byId('vini')]);
    case 4:
      // 2.75 * 3.80 * 9.00 ≈ 94.05x — comfortably > 50.00
      return stamp([byId('rma-w'), byId('draw'), byId('mbappe-htrick')]);
  }
}

export function App() {
  const debug = useDebug();
  const [selections, setSelections] = useState<Selection[]>([]);
  const [speedScale, setSpeedScale] = useState(1);
  const [live, setLive] = useState<ButtonLiveState | null>(null);
  // PASS 3 — Tier 3 odds effect selector (default flames; toggled in debug).
  const [tier3OddsEffect, setTier3OddsEffect] = useState<
    'flames' | 'smoke'
  >(buttonProgressionConfig.tier3OddsEffect);
  // PASS 3 — "Bouncy entry only on FIRST mount per session". Once the bet
  // slip has mounted (and started its bounce) once, this flips to true and
  // subsequent 0 → 1 transitions skip the bounce.
  const hasBouncedOnceRef = useRef(false);

  const selectedIds = useMemo(
    () => new Set(selections.map((s) => s.id)),
    [selections],
  );
  const cumulativeOdds = useMemo(
    () => computeCumulativeOdds(selections),
    [selections],
  );
  const tier: Tier = tierForOdds(cumulativeOdds);

  /* ---------- handlers ---------- */
  // REGRESSION FIX — removed `queueMicrotask` ref-flipping from setSelections
  // updaters. The microtask was firing BEFORE React re-rendered with the new
  // state, so BetSlipShell mounted with bouncy=false on its very first mount.
  // The ref is now flipped via BetSlipShell's onMounted callback (below).
  const addRandom = useCallback(() => {
    if (selections.length >= buttonProgressionConfig.maxSelections) return;
    const available = MOCK_PICKS.filter(
      (p) => !selections.some((s) => s.id.startsWith(p.id)),
    );
    const pool = available.length > 0 ? available : MOCK_PICKS;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setSelections((s) => [...s, { ...next, id: `${next.id}-${s.length}` }]);
  }, [selections]);

  const togglePick = useCallback((id: string) => {
    setSelections((current) => {
      const existing = current.find((s) => s.id.startsWith(id));
      if (existing) return current.filter((s) => s !== existing);
      if (current.length >= buttonProgressionConfig.maxSelections) return current;
      const pick = MOCK_PICKS.find((p) => p.id === id);
      if (!pick) return current;
      return [...current, { ...pick, id: `${pick.id}-${current.length}` }];
    });
  }, []);

  const removeLast = useCallback(() => {
    setSelections((s) => s.slice(0, -1));
  }, []);

  const reset = useCallback(() => setSelections([]), []);

  const jumpToTier = useCallback((target: Tier) => {
    setSelections(selectionsForTier(target));
  }, []);

  // Map selected pick ids back to base ids (without -N suffix) for the
  // market accordion so it can highlight which picks are in the slip.
  const baseSelectedIds = useMemo(() => {
    const s = new Set<string>();
    for (const sel of selections) {
      // id format: "psg-w-0" -> base "psg-w"
      const lastDash = sel.id.lastIndexOf('-');
      s.add(sel.id.slice(0, lastDash));
    }
    return s;
  }, [selections]);

  /* ============================================================ */
  /*  Render                                                      */
  /* ============================================================ */
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      {/* Phone frame */}
      <div className="relative">
        <div className="rounded-[44px] bg-black/40 p-3 shadow-[0_30px_80px_rgba(75,32,255,0.25)] ring-1 ring-white/10">
          <div
            className="relative h-[844px] w-[390px] overflow-hidden rounded-[36px]"
            style={{
              background:
                'radial-gradient(circle at 50% 0%, #1a0f3d 0%, #0a0a0d 50%)',
            }}
          >
            {/* Notch */}
            <div className="absolute left-1/2 top-2 z-30 h-6 w-28 -translate-x-1/2 rounded-full bg-black" />

            {/* Scrollable content area */}
            <div className="no-scrollbar absolute inset-0 overflow-y-auto pb-[160px]">
              <HomeScreenChrome
                picks={MOCK_PICKS}
                selectedIds={baseSelectedIds}
                onTogglePick={togglePick}
              />
              {/* Debug controls inline (only visible with ?debug=true) */}
              {debug && (
                <div className="mx-3 mb-2 mt-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
                  <div className="mb-2 text-[11px] font-bold text-amber-300">
                    DEBUG · jump to tier
                  </div>
                  <div className="mb-2 flex gap-1.5">
                    {[0, 1, 2, 3, 4].map((t) => (
                      <button
                        key={t}
                        onClick={() => jumpToTier(t as Tier)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-bold ${
                          tier === t
                            ? 'bg-amber-300 text-black'
                            : 'bg-white/10 text-white'
                        }`}
                      >
                        T{t}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSpeedScale((s) => (s === 1 ? 3 : 1))}
                    className="w-full rounded-md bg-white/10 px-2 py-1.5 text-[11px] font-bold text-white"
                  >
                    Animation speed: {speedScale === 1 ? '1× normal' : '3× slow'}
                  </button>
                  {/* PASS 3 — Tier 3 odds effect variant toggle. */}
                  <button
                    onClick={() =>
                      setTier3OddsEffect((e) =>
                        e === 'flames' ? 'smoke' : 'flames',
                      )
                    }
                    className="mt-1.5 w-full rounded-md bg-white/10 px-2 py-1.5 text-[11px] font-bold text-white"
                  >
                    T3 odds effect: {tier3OddsEffect === 'flames' ? '🔥 flames' : '💨 smoke'}
                  </button>
                </div>
              )}

              {/* Action controls — Add / Remove / Reset */}
              <div className="mx-3 mb-2 mt-3 flex gap-2">
                <button
                  onClick={addRandom}
                  disabled={
                    selections.length >= buttonProgressionConfig.maxSelections
                  }
                  className="flex-1 rounded-xl bg-gradient-to-r from-[#4b20ff] to-[#9730ff] px-3 py-2.5 text-[12px] font-bold text-white disabled:opacity-50"
                >
                  + Añadir selección
                </button>
                <button
                  onClick={removeLast}
                  disabled={selections.length === 0}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[12px] font-bold text-white/90 disabled:opacity-30"
                >
                  − Quitar
                </button>
                <button
                  onClick={reset}
                  disabled={selections.length === 0}
                  className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-[12px] font-bold text-white/90 disabled:opacity-30"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Fixed bottom: gradient fade + button slot + navbar.
                PASS 3 — The bet slip is now conditionally mounted via
                AnimatePresence (mode="wait" queues the entry until any
                in-flight exit finishes). A reserved-height slot keeps the
                navbar pinned even when the button is unmounted. */}
            <div className="absolute inset-x-0 bottom-0 z-20">
              <div
                className="pointer-events-none absolute inset-x-0 -top-10 h-10"
                style={{
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                }}
              />
              <div
                className="relative"
                style={{
                  background:
                    'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.95) 100%)',
                }}
              >
                {/* Reserved-height slot — keeps navbar pinned regardless
                    of whether the slip is mounted. */}
                <div
                  className="relative"
                  style={{
                    height: buttonProgressionConfig.slotReservedHeightPx,
                  }}
                >
                  <AnimatePresence mode="wait">
                    {selections.length > 0 && (
                      <BetSlipShell
                        key="bet-slip"
                        bouncy={!hasBouncedOnceRef.current}
                        onMounted={() => {
                          // REGRESSION FIX — flip the "session has bounced
                          // once" flag AFTER this mount has consumed the
                          // `bouncy` prop. The next 0 → 1 mount will see
                          // bouncy=false and snap to final state.
                          hasBouncedOnceRef.current = true;
                        }}
                      >
                        <ButtonPreviewMomios
                          selectionCount={selections.length}
                          cumulativeOdds={cumulativeOdds}
                          speedScale={speedScale}
                          onLiveState={debug ? setLive : undefined}
                          tier3OddsEffect={tier3OddsEffect}
                        />
                      </BetSlipShell>
                    )}
                  </AnimatePresence>
                </div>
                <Navbar />
              </div>
            </div>

            {/* Debug overlay (tier badge + live ambient phases) */}
            {debug && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute left-2 bottom-[170px] z-40 w-[156px] rounded-lg border border-amber-400/40 bg-black/85 px-2.5 py-1.5 text-left"
              >
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-300">
                  Debug
                </div>
                <div className="text-[12px] font-black text-white">
                  Tier {tier} · {buttonProgressionConfig.tiers[tier].name}
                </div>
                <div className="text-[10px] font-medium text-white/70">
                  Odds {cumulativeOdds.toFixed(2)}x
                </div>
                <div className="text-[10px] font-medium text-white/70">
                  {selections.length} / {buttonProgressionConfig.maxSelections} picks
                </div>
                {/* Live phase readouts — driven by ButtonPreviewMomios useMotionValueEvent */}
                <div className="mt-1 flex items-center justify-between border-t border-amber-400/20 pt-1">
                  <span className="text-[9px] uppercase tracking-wider text-amber-300/80">
                    Tremor
                  </span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      live?.tremorActive ? 'bg-amber-300' : 'bg-white/20'
                    }`}
                  />
                </div>
                <PhaseBar label="Glow" value={live?.borderPhase ?? 0} />
                <PhaseBar label="Breath" value={live?.breathPhase ?? 0} />
                {/* T3 odds effect toggle — pinned here so it's always reachable */}
                <button
                  onClick={() =>
                    setTier3OddsEffect((e) =>
                      e === 'flames' ? 'smoke' : 'flames',
                    )
                  }
                  className="mt-1.5 w-full rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white"
                >
                  T3: {tier3OddsEffect === 'flames' ? '🔥 flames' : '💨 smoke'}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
