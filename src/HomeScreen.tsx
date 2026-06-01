import { motion } from 'framer-motion';
import { useState } from 'react';
import betsIcon from './assets/bets.svg';
import gamingIcon from './assets/gaming.svg';
import misEntradasIcon from './assets/mis_entradas.svg';
import searchIcon from './assets/search.svg';
import shieldIcon from './assets/shield.svg';
import type { Selection } from './types';

/* ============================================================ */
/*  Mock match data — six picks the user can add                */
/* ============================================================ */
export const MOCK_PICKS: Selection[] = [
  { id: 'psg-w', match: 'PSG vs Real Madrid', pick: 'PSG gana', odds: 1.75 },
  { id: 'rma-w', match: 'PSG vs Real Madrid', pick: 'Real Madrid gana', odds: 2.75 },
  { id: 'draw', match: 'PSG vs Real Madrid', pick: 'Empate', odds: 3.8 },
  { id: 'lewa', match: 'Anota gol — Lewandowski', pick: 'Lewandowski anota', odds: 1.95 },
  { id: 'mbappe', match: 'Anota gol — Mbappé', pick: 'Mbappé anota', odds: 1.65 },
  { id: 'vini', match: 'Anota gol — Vinicius', pick: 'Vinicius anota', odds: 2.1 },
  // High-odds picks — unlock Tier 4 ("Legendario", ≥ 50x cumulative).
  { id: 'mbappe-htrick', match: 'Hat-trick', pick: 'Mbappé hat-trick', odds: 9.0 },
  { id: 'psg-4plus', match: 'Goleada', pick: 'PSG 4+ goles', odds: 13.5 },
  { id: 'combo-psg-mbappe', match: 'Combo doble', pick: 'PSG gana + Mbappé anota', odds: 5.5 },
];

/* ============================================================ */
/*  Status bar                                                  */
/* ============================================================ */
function StatusBar() {
  return (
    <div className="flex h-11 w-full items-center justify-between px-6 pt-1">
      <span className="text-[14px] font-semibold tracking-tight text-white">
        9:41
      </span>
      <div className="flex items-center gap-1.5 text-white">
        {/* signal */}
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none" aria-hidden>
          <rect x="0" y="7" width="3" height="4" rx="0.5" fill="white" />
          <rect x="5" y="4" width="3" height="7" rx="0.5" fill="white" />
          <rect x="10" y="2" width="3" height="9" rx="0.5" fill="white" />
          <rect x="15" y="0" width="3" height="11" rx="0.5" fill="white" />
        </svg>
        {/* wifi */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none" aria-hidden>
          <path
            d="M8 10.5l-1.5-1.7M8 10.5l1.5-1.7M2 5.4a8.6 8.6 0 0112 0M4.5 7.7a5 5 0 017 0"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {/* battery */}
        <div className="relative ml-1 h-[10px] w-[22px] rounded-[2.5px] border border-white/80">
          <div className="absolute inset-[1px] rounded-[1.5px] bg-white" />
          <div className="absolute -right-[2px] top-1/2 h-[4px] w-[1.5px] -translate-y-1/2 rounded-r-sm bg-white/80" />
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Header — Draftea logo, balance, lightning, profile          */
/* ============================================================ */
function Header() {
  return (
    <div className="flex h-14 w-full items-center justify-between px-4">
      {/* Draftea wordmark */}
      <div className="flex items-center gap-1.5">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
          <path
            d="M3 11a8 8 0 0116 0v8L11 16l-8 3v-8z"
            fill="url(#dgrad)"
          />
          <defs>
            <linearGradient id="dgrad" x1="0" y1="0" x2="22" y2="22">
              <stop stopColor="#9730ff" />
              <stop offset="1" stopColor="#4b20ff" />
            </linearGradient>
          </defs>
        </svg>
        <span className="text-[15px] font-black tracking-wider text-white">
          DRAFTEA
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[13px] font-black text-white">$0.00</span>
          <span className="text-[9px] font-medium uppercase tracking-wider text-white/50">
            Balance
          </span>
        </div>
        {/* lightning quick-deposit */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            background:
              'linear-gradient(135deg, #4b20ff 0%, #9730ff 100%)',
          }}
          aria-label="Quick deposit"
        >
          <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden>
            <path
              d="M8 0L0 9h5l-1 7 8-9H7l1-7z"
              fill="white"
            />
          </svg>
        </button>
        {/* profile */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5"
          aria-label="Profile"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="6" r="2.6" stroke="white" strokeWidth="1.4" />
            <path
              d="M3 14a5 5 0 0110 0"
              stroke="white"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Leagues row — circular sport/league tabs                    */
/* ============================================================ */
function LeaguesTab() {
  const items = [
    { id: 'todofut', label: 'TODOFUT', glyph: '⚽' },
    { id: 'champ', label: 'CHAMPI…', glyph: '🏆' },
    { id: 'nfl', label: 'NFL', glyph: '🏈' },
    { id: 'mlb', label: 'MLB', glyph: '⚾' },
    { id: 'tenis', label: 'TENIS', glyph: '🎾' },
    { id: 'prem', label: 'PREMI…', glyph: '🦁' },
  ];
  return (
    <div className="no-scrollbar flex w-full gap-3 overflow-x-auto px-3 py-2">
      {items.map((it, i) => (
        <div
          key={it.id}
          className="flex shrink-0 flex-col items-center gap-1.5"
        >
          <div
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-full border text-[18px] ${
              i === 0
                ? 'border-[#4b20ff] bg-gradient-to-br from-[#4b20ff] to-[#9730ff]'
                : 'border-white/15 bg-white/5'
            }`}
          >
            {it.glyph}
          </div>
          <span className="text-[9px] font-bold tracking-wider text-white/70">
            {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================ */
/*  Match tabs + pills row                                      */
/* ============================================================ */
function TabsAndPills() {
  return (
    <div className="flex w-full flex-col gap-2 px-3">
      <div className="flex items-center gap-3 py-1">
        <span className="text-[14px] font-black text-white">TODOS</span>
        {['POPULARES', 'PARTIDOS', '1era MITAD', 'TIROS'].map((t, i) => (
          <button
            key={t}
            className={`rounded-full px-3 py-1.5 text-[11px] font-bold tracking-wide ${
              i === 0
                ? 'bg-gradient-to-r from-[#4b20ff] to-[#9730ff] text-white'
                : 'border border-white/15 text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Promo carousel — Champions card with PSG vs Real Madrid     */
/* ============================================================ */
type PromoCarouselProps = {
  selectedIds: Set<string>;
  onTogglePick: (id: string) => void;
};

function PromoCarousel({ selectedIds, onTogglePick }: PromoCarouselProps) {
  // Card matches Figma "newLeagueMarkets" (1624:44632).
  // Missing asset: the decorative "light" glow blob positioned at the
  // top of the card (imgLight in the Figma export). Skipped here —
  // ask Javier to upload it; placeholder slot left below where it goes.
  // Each odds button maps to a MOCK_PICKS id so clicking it toggles the
  // pick into the bet slip, with two visual states (default / selected)
  // matching Figma nodes 17726:11289 (default) and 1624:44709 (selected).
  const oddsButtons = [
    { id: 'psg-w', l: 'PSG', v: '1.75x' },
    { id: 'draw', l: 'EMPATE', v: '3.80x' },
    { id: 'rma-w', l: 'RMA', v: '2.75x' },
  ];
  return (
    <div className="w-full px-3 py-2">
      <div
        className="relative w-full overflow-hidden rounded-[20px] border border-[rgba(251,251,251,0.24)] bg-black pt-2"
        style={{ backdropFilter: 'blur(10.15px)', WebkitBackdropFilter: 'blur(10.15px)' }}
      >
        {/* PLACEHOLDER for the decorative "light" graphic — Figma puts
            it at top: -36.11px overflowing slightly above the card. */}

        {/* League + tags row */}
        <div className="flex w-full items-center justify-center gap-1 px-2.5">
          <div className="flex items-center gap-1">
            <p
              className="whitespace-nowrap text-right text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              Champions
            </p>
            <span
              aria-hidden
              className="block h-0.5 w-0.5 rounded-full bg-[rgba(251,251,251,0.5)]"
            />
          </div>
          <div className="flex items-start gap-1">
            <span
              className="flex h-[15px] min-w-5 items-center justify-center rounded-md bg-[rgba(251,251,251,0.16)] px-1 text-[10px] font-bold leading-[15px] text-[rgba(251,251,251,0.7)]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              PA
            </span>
            <span
              className="flex h-[15px] min-w-5 items-center justify-center rounded-md bg-[rgba(251,251,251,0.16)] px-1 text-[10px] font-bold leading-[15px] text-[rgba(251,251,251,0.7)]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              90&apos;
            </span>
          </div>
        </div>

        {/* Match row — Team 1 / center kickoff / Team 2 */}
        <div className="flex w-full items-start gap-2 px-2.5 pb-2">
          <div className="flex w-[108px] flex-col items-center gap-0.5">
            <img
              src={shieldIcon}
              alt=""
              aria-hidden
              className="h-8 w-8"
            />
            <p
              className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              Paris-Saint Germain
            </p>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center self-stretch">
            <p
              className="whitespace-nowrap text-[12px] font-bold leading-[18px] text-[#fbfbfb]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              Hoy 18:00
            </p>
          </div>
          <div className="flex w-[108px] flex-col items-center justify-end gap-0.5">
            <img
              src={shieldIcon}
              alt=""
              aria-hidden
              className="h-8 w-8"
            />
            <p
              className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.7)]"
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              Real Madrid
            </p>
          </div>
        </div>

        {/* Odds row — 3 buttonsPropsBets. Each toggles a MOCK_PICKS id
            into/out of the bet slip. Selected state replaces the bg with
            a lime→cyan gradient, swaps the border to solid #d2ff72, and
            bumps the odds value to Bold. */}
        <div className="flex w-full items-center justify-end gap-1 px-2.5 pb-2.5">
          {oddsButtons.map((o) => {
            const selected = selectedIds.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onTogglePick(o.id)}
                className={`flex h-11 min-w-[58px] flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border px-3 py-1 transition-all duration-200 active:scale-[0.96] ${
                  selected
                    ? 'border-[#d2ff72] bg-gradient-to-b from-[rgba(210,255,114,0.16)] to-[rgba(86,222,234,0.16)]'
                    : 'border-[rgba(251,251,251,0.08)] bg-[rgba(251,251,251,0.1)] hover:bg-[rgba(251,251,251,0.14)]'
                }`}
              >
                <span
                  className="whitespace-nowrap text-center text-[10px] font-medium leading-[15px] text-[rgba(251,251,251,0.5)]"
                  style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                >
                  {o.l}
                </span>
                <span
                  className={`whitespace-nowrap text-center text-[13px] leading-4 text-[#fbfbfb] ${
                    selected ? 'font-bold' : 'font-medium'
                  }`}
                  style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                >
                  {o.v}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Carousel dots — preserved from previous implementation. The
          Figma node is just one card; the dots belong to the carousel
          container that holds it. */}
      <div className="mt-2 flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full ${
              i === 0 ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Market accordion — "Anota gol" with player cards            */
/* ============================================================ */
type MarketProps = {
  picks: Selection[];
  selectedIds: Set<string>;
  onTogglePick: (id: string) => void;
};

function MarketAccordion({ picks, selectedIds, onTogglePick }: MarketProps) {
  return (
    <div className="w-full px-3 py-2">
      <div className="rounded-2xl border border-white/10 bg-[#101015]/80 p-3 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-black text-white">
              Anota gol en cualquier momento
            </span>
          </div>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/80">
            90'
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {picks.map((p) => {
            const selected = selectedIds.has(p.id);
            return (
              <motion.button
                key={p.id}
                type="button"
                onClick={() => onTogglePick(p.id)}
                whileTap={{ scale: 0.97 }}
                className={`relative flex flex-col items-start gap-1 rounded-xl border p-2 text-left transition-colors ${
                  selected
                    ? 'border-[#4b20ff] bg-gradient-to-br from-[#1a0a40] to-[#230c3e]'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex w-full items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[8px] font-black text-white/70">
                    {p.pick.includes('PSG')
                      ? 'PSG'
                      : p.pick.includes('Real')
                        ? 'RMA'
                        : p.pick.includes('Empate')
                          ? '—'
                          : 'POS'}
                  </div>
                  <span className="truncate text-[10px] font-bold text-white">
                    {p.pick}
                  </span>
                </div>
                <div className="mt-1 flex w-full items-center justify-between">
                  <span className="text-[9px] font-medium text-white/50">
                    {selected ? 'En cupón' : 'Añadir'}
                  </span>
                  <span
                    className={`text-[13px] font-black ${
                      selected ? 'text-[#c4b3ff]' : 'text-white'
                    }`}
                  >
                    {p.odds.toFixed(2)}x
                  </span>
                </div>
                {selected && (
                  <motion.span
                    layoutId={`tick-${p.id}`}
                    className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, #4b20ff, #9730ff)',
                    }}
                  >
                    <svg
                      width="9"
                      height="9"
                      viewBox="0 0 9 9"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M1.5 4.7L3.7 6.9 7.5 2.1"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/*  Bottom navbar (Figma "navbar and search" node 1628:42603)   */
/*  4 tabs (Bets default-selected) + dedicated search button.   */
/*  Icons sourced from src/assets/ by name-matching the tab id. */
/* ============================================================ */
function Navbar() {
  const [activeTab, setActiveTab] = useState<'bets' | 'entradas' | 'gaming' | 'rewards'>('bets');
  const tabs: Array<{
    id: 'bets' | 'entradas' | 'gaming' | 'rewards';
    label: string;
    icon: string | null;
  }> = [
    { id: 'bets', label: 'Bets', icon: betsIcon },
    { id: 'entradas', label: 'Mis entradas', icon: misEntradasIcon },
    { id: 'gaming', label: 'Gaming', icon: gamingIcon },
    // Rewards: no `rewards.svg` in src/assets/ yet. Slot left empty —
    // awaiting upload. Per project rule (CLAUDE.md): never reinterpret
    // or substitute icons; wait for the asset.
    { id: 'rewards', label: 'Rewards', icon: null },
  ];

  return (
    <div className="flex w-full items-center gap-2 px-4 pb-4">
      {/* Tab pill — 4 tabs in a single rounded container */}
      <div className="flex h-[58px] flex-1 items-center justify-center rounded-[56px] border border-[rgba(251,251,251,0.16)] bg-[#191919] p-1.5">
        {tabs.map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex h-[46px] flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[56px] px-1 pt-[3px] transition-colors duration-150 active:scale-[0.97] ${
                isActive ? 'bg-[rgba(251,251,251,0.12)]' : ''
              }`}
            >
              <div className="flex h-5 w-full items-center justify-center">
                {t.icon ? (
                  <img src={t.icon} alt="" aria-hidden className="h-5 w-5" />
                ) : (
                  // Placeholder while awaiting rewards.svg upload.
                  <span
                    className="block h-5 w-5 rounded-full bg-white/15"
                    aria-hidden
                  />
                )}
              </div>
              <span
                className={`whitespace-nowrap text-[10px] font-medium leading-[15px] ${
                  isActive ? 'text-[#fbfbfb]' : 'text-[rgba(251,251,251,0.7)]'
                }`}
                style={{ fontFamily: 'Red Hat Display, sans-serif' }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search — separate circular button */}
      <button
        type="button"
        aria-label="Search"
        className="flex size-[58px] shrink-0 cursor-pointer items-center justify-center rounded-[56px] border border-[rgba(251,251,251,0.16)] bg-[#191919] p-2.5 transition-colors duration-150 active:scale-[0.97]"
      >
        <img src={searchIcon} alt="" aria-hidden className="h-6 w-6" />
      </button>
    </div>
  );
}

/* ============================================================ */
/*  Combined HomeScreenChrome — everything above the button     */
/* ============================================================ */
type HomeScreenChromeProps = {
  picks: Selection[];
  selectedIds: Set<string>;
  onTogglePick: (id: string) => void;
};

export function HomeScreenChrome({
  picks,
  selectedIds,
  onTogglePick,
}: HomeScreenChromeProps) {
  return (
    <div className="flex w-full flex-col">
      <StatusBar />
      <Header />
      <LeaguesTab />
      <TabsAndPills />
      <PromoCarousel selectedIds={selectedIds} onTogglePick={onTogglePick} />
      <MarketAccordion
        picks={picks}
        selectedIds={selectedIds}
        onTogglePick={onTogglePick}
      />
    </div>
  );
}

export { Navbar };
