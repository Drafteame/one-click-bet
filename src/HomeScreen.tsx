import { motion } from 'framer-motion';
import { useState } from 'react';
import betsIcon from './assets/bets.svg';
import chevronIcon from './assets/chevron.svg';
import gamingIcon from './assets/gaming.svg';
import misEntradasIcon from './assets/mis_entradas.svg';
import playerIcon from './assets/player.svg';
import rewardsIcon from './assets/rewards.png';
import searchIcon from './assets/search.svg';
import shieldIcon from './assets/shield.svg';
import statsIcon from './assets/stats.svg';
import type { Selection } from './types';

/* ============================================================ */
/*  Mock match data — six picks the user can add                */
/* ============================================================ */
export const MOCK_PICKS: Selection[] = [
  // Base picks — straightforward goal/team props at T0–T1 odds.
  { id: 'psg-w', match: 'PSG vs Real Madrid', pick: 'PSG gana', odds: 1.75 },
  { id: 'rma-w', match: 'PSG vs Real Madrid', pick: 'Real Madrid gana', odds: 2.75 },
  { id: 'draw', match: 'PSG vs Real Madrid', pick: 'Empate', odds: 3.8 },
  { id: 'lewa', match: 'Anota gol — Lewandowski', pick: 'Lewandowski anota', odds: 1.95 },
  { id: 'mbappe', match: 'Anota gol — Mbappé', pick: 'Mbappé anota', odds: 1.65 },
  { id: 'vini', match: 'Anota gol — Vinicius', pick: 'Vinicius anota', odds: 2.1 },
  // Mid-odds picks — single-pick T2 ("Súper", ≥ 5x).
  { id: 'combo-psg-mbappe', match: 'Combo doble', pick: 'PSG gana + Mbappé anota', odds: 5.5 },
  { id: 'mbappe-htrick', match: 'Hat-trick', pick: 'Mbappé hat-trick', odds: 9.0 },
  { id: 'lewa-htrick', match: 'Hat-trick', pick: 'Lewandowski hat-trick', odds: 11.0 },
  { id: 'psg-4plus', match: 'Goleada', pick: 'PSG 4+ goles', odds: 13.5 },
  // High-odds picks — single-pick T3 ("Máximo", ≥ 15x).
  { id: 'vini-htrick', match: 'Hat-trick', pick: 'Vinicius hat-trick', odds: 16.0 },
  { id: 'lewa-4goals', match: 'Goleada', pick: 'Lewandowski 4+ goles', odds: 28.0 },
  // Jackpot pick — single-pick T4 ("Legendario", ≥ 50x).
  { id: 'mbappe-4goals', match: 'Goleada', pick: 'Mbappé 4+ goles', odds: 60.0 },
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
/*  Match tabs row — Figma node 1664:42888                      */
/*  Horizontal scroll: a "TODOS" gradient pill (selected) +     */
/*  a series of two-line tabs (HOME vs AWAY / HOY (time)).      */
/* ============================================================ */
function MatchTabsRow() {
  const [activeMatch, setActiveMatch] = useState<string>('todos');
  const matchTabs: Array<
    | { id: 'todos' }
    | { id: string; home: string; away: string; date: string; time: string }
  > = [
    { id: 'todos' },
    { id: 'ars-rma', home: 'ARS', away: 'RMA', date: 'HOY', time: '00:00' },
    { id: 'fcb-psg', home: 'FCB', away: 'PSG', date: 'HOY', time: '00:00' },
    { id: 'abc-xyz-1', home: 'ABC', away: 'XYZ', date: 'HOY', time: '00:00' },
    { id: 'abc-xyz-2', home: 'ABC', away: 'XYZ', date: 'HOY', time: '00:00' },
  ];

  return (
    <div className="flex w-full flex-col items-start px-3">
      <div className="no-scrollbar sticky top-0 flex w-full items-center gap-3 overflow-x-auto pb-1 pr-3 pt-2">
        {matchTabs.map((t) => {
          const isTodos = t.id === 'todos';
          const isActive = activeMatch === t.id;
          if (isTodos) {
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveMatch(t.id)}
                className="relative flex h-5 shrink-0 cursor-pointer items-center justify-center rounded-[56px] px-1.5 text-[12px] font-bold leading-[18px] text-[#fbfbfb] active:scale-[0.96] transition-transform"
                style={{
                  backgroundImage:
                    'linear-gradient(53.34deg, #4b20ff 0%, #9730ff 100%)',
                  fontFamily: 'Red Hat Display, sans-serif',
                }}
              >
                TODOS
                {/* TODO: small 10×3 arrow notch below the pill —
                    awaiting asset (imgArrow in the Figma export). */}
              </button>
            );
          }
          // Two-line match tab (teams + date/time).
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveMatch(t.id)}
              className={`flex min-h-[40px] shrink-0 cursor-pointer flex-col items-center justify-center active:scale-[0.96] transition-transform ${
                isActive ? 'opacity-100' : 'opacity-100'
              }`}
              style={{ fontFamily: 'Red Hat Display, sans-serif' }}
            >
              <div className="flex items-baseline justify-center gap-0.5 text-[12px] font-bold leading-[18px] text-[rgba(251,251,251,0.5)]">
                <span>{t.home}</span>
                <span>vs</span>
                <span>{t.away}</span>
              </div>
              <span className="whitespace-nowrap text-[12px] font-medium leading-4 text-[rgba(251,251,251,0.5)]">
                {t.date} ({t.time})
              </span>
            </button>
          );
        })}
      </div>
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
/*  Market accordion — Figma "marketAccordeon" node 1628:42604  */
/*  2×2 grid of player-prop cards. Each card has the player's   */
/*  silhouette (player.svg), name + position, match info, stats */
/*  icon, and an odds button at the bottom that toggles the     */
/*  corresponding pick into the bet slip. Selected state uses   */
/*  the same lime-cyan visual language as the PromoCarousel.    */
/*                                                              */
/*  Filters to the player-goal-prop picks only (lewa, mbappe,   */
/*  vini, mbappe-htrick). The other picks (team wins, draws,    */
/*  combo, hat-trick variants) don't fit this layout and live   */
/*  elsewhere (PromoCarousel + debug random add).               */
/* ============================================================ */
type MarketProps = {
  picks: Selection[];
  selectedIds: Set<string>;
  onTogglePick: (id: string) => void;
};

type PlayerMeta = {
  lastName: string;
  position: string;
  homeAbbrev: string;
  awayAbbrev: string;
  date: string;
  time: string;
};

const PLAYER_META: Record<string, PlayerMeta> = {
  lewa: {
    lastName: 'Lewandowski',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  mbappe: {
    lastName: 'Mbappé',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  vini: {
    lastName: 'Vinicius',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  'mbappe-htrick': {
    lastName: 'Mbappé',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  // Tier-progression picks — each in PLAYER_META so it surfaces in
  // the player-card grid (clickable, no need for random-add).
  'lewa-htrick': {
    lastName: 'Lewandowski',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  'vini-htrick': {
    lastName: 'Vinicius',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  'lewa-4goals': {
    lastName: 'Lewandowski',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
  'mbappe-4goals': {
    lastName: 'Mbappé',
    position: 'DEL',
    homeAbbrev: 'PSG',
    awayAbbrev: 'RMA',
    date: 'HOY',
    time: '18:00',
  },
};

function MarketAccordion({ picks, selectedIds, onTogglePick }: MarketProps) {
  const [isOpen, setIsOpen] = useState(true);
  // Only show picks that are mapped to a player. Other picks (team
  // wins / draw / combos / goleada) don't fit this layout.
  const playerPicks = picks.filter((p) => PLAYER_META[p.id]);

  return (
    <div className="w-full border-b border-[rgba(251,251,251,0.12)] bg-black px-3 pb-3">
      {/* Header — clickable to expand/collapse */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex h-11 w-full cursor-pointer items-center py-2.5"
        aria-expanded={isOpen}
      >
        <div className="flex flex-1 items-center gap-1">
          <p
            className="text-left text-[14px] font-bold leading-[21px] text-[#fbfbfb]"
            style={{ fontFamily: 'Red Hat Display, sans-serif' }}
          >
            Anota gol en cualquier momento
          </p>
          <span
            className="flex h-[15px] min-w-5 items-center justify-center rounded-md bg-[rgba(251,251,251,0.16)] px-1 text-[10px] font-bold leading-[15px] text-[rgba(251,251,251,0.7)]"
            style={{ fontFamily: 'Red Hat Display, sans-serif' }}
          >
            90&apos;
          </span>
        </div>
        <div className="ml-6 flex size-6 shrink-0 items-center justify-center rounded-full border border-[rgba(251,251,251,0.24)]">
          <img
            src={chevronIcon}
            alt=""
            aria-hidden
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </div>
      </button>

      {/* Body — 2×2 grid of player-prop cards + Ver todos CTA */}
      {isOpen && (
        <div className="flex flex-col gap-1 pt-1">
          <div className="grid grid-cols-2 gap-2">
            {playerPicks.map((p) => {
              const meta = PLAYER_META[p.id];
              const selected = selectedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onTogglePick(p.id)}
                  // Selected state changes ONLY the odds button at the
                  // bottom (lime-cyan gradient + Bold odds); the outer
                  // card border stays neutral in both states.
                  className="relative flex cursor-pointer flex-col items-center gap-2 overflow-hidden rounded-[20px] border border-[rgba(251,251,251,0.12)] bg-black p-2.5 transition-all duration-200 active:scale-[0.98]"
                >
                  {/* TODO: decorative "light" glow at top of card —
                      Figma uses imgLight (no asset uploaded). */}

                  {/* Top-left: stats icon (chart bars) */}
                  <div className="absolute left-2.5 top-2.5 z-10 flex size-5 items-center justify-center rounded-md bg-[rgba(251,251,251,0.12)] p-0.5 backdrop-blur-sm">
                    <img
                      src={statsIcon}
                      alt=""
                      aria-hidden
                      className="h-3 w-3"
                    />
                  </div>

                  {/* Top-right: match teams + date + time */}
                  <div className="absolute right-2.5 top-2.5 z-10 flex flex-col items-end">
                    <div
                      className="flex items-baseline gap-px text-[10px] leading-[15px]"
                      style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                    >
                      <span className="font-medium text-[rgba(251,251,251,0.7)]">
                        {meta.homeAbbrev}
                      </span>
                      <span className="font-medium text-[rgba(251,251,251,0.44)]">
                        vs
                      </span>
                      <span className="font-medium text-[rgba(251,251,251,0.44)]">
                        {meta.awayAbbrev}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-medium leading-[15px] text-[rgba(251,251,251,0.44)]"
                      style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                    >
                      {meta.date}
                    </span>
                    <span
                      className="text-[10px] font-medium leading-[15px] text-[rgba(251,251,251,0.44)]"
                      style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                    >
                      {meta.time}
                    </span>
                  </div>

                  {/* Player image + name + position.
                      The gradient fade sits ABOVE the bottom of the
                      silhouette (covering shoulders/chest) and EXTENDS
                      DOWN behind the player name, so the head reads
                      crisp and the name floats over a black wash. */}
                  <div className="relative flex w-full flex-col items-center pt-2">
                    <img
                      src={playerIcon}
                      alt=""
                      aria-hidden
                      className="relative z-0"
                      width={76}
                      height={76}
                    />
                    {/* Fade — 60px tall, ~140px wide, anchored to the
                        bottom of the player container. Starts halfway
                        down the silhouette, ends just past the name. */}
                    <div
                      className="pointer-events-none absolute bottom-0 left-1/2 z-[1] h-[60px] w-[140px] -translate-x-1/2 bg-gradient-to-b from-transparent to-black"
                      aria-hidden
                    />
                    <div
                      className="relative z-[2] flex items-baseline justify-center gap-0.5"
                      style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                    >
                      <span className="text-[14px] font-medium leading-[21px] text-[#fbfbfb]">
                        {meta.lastName}
                      </span>
                      <span className="text-[10px] font-medium leading-[15px] text-[rgba(251,251,251,0.44)]">
                        {meta.position}
                      </span>
                    </div>
                  </div>

                  {/* Odds button at the bottom — same default/selected
                      visual language as the PromoCarousel buttons. */}
                  <div
                    className={`flex h-11 w-full items-center justify-center overflow-hidden rounded-xl border px-3 py-1 ${
                      selected
                        ? 'border-[#d2ff72] bg-gradient-to-b from-[rgba(210,255,114,0.16)] to-[rgba(86,222,234,0.16)]'
                        : 'border-[rgba(251,251,251,0.08)] bg-[rgba(251,251,251,0.1)]'
                    }`}
                  >
                    <span
                      className={`whitespace-nowrap text-center text-[13px] leading-4 text-[#fbfbfb] ${
                        selected ? 'font-bold' : 'font-medium'
                      }`}
                      style={{ fontFamily: 'Red Hat Display, sans-serif' }}
                    >
                      {p.odds.toFixed(2)}x
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Ver todos (N) — tertiary CTA */}
          <button
            type="button"
            className="mt-1 flex w-full cursor-pointer items-center justify-center gap-1 py-2 text-[14px] font-medium leading-[21px] text-[#fbfbfb] transition-opacity hover:opacity-80"
            style={{ fontFamily: 'Red Hat Display, sans-serif' }}
          >
            Ver todos ({playerPicks.length})
            <img
              src={chevronIcon}
              alt=""
              aria-hidden
              className="h-4 w-4"
            />
          </button>
        </div>
      )}
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
    { id: 'rewards', label: 'Rewards', icon: rewardsIcon },
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
              {/* Icon row. The rewards badge is rendered at 26×26 to
                  match Figma (the other tab icons are 20×20). It overflows
                  the row's nominal 20px height by ~3px each side, so the
                  row and button drop overflow-hidden / clip and the
                  badge can poke above/below the surrounding row. */}
              <div className="flex h-5 w-full items-center justify-center">
                <img
                  src={t.icon}
                  alt=""
                  aria-hidden
                  className={t.id === 'rewards' ? 'h-[26px] w-[26px]' : 'h-5 w-5'}
                />
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
      <MatchTabsRow />
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
