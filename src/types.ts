export type Selection = {
  id: string;
  /** Betting market, e.g. "Money line" or "Anota gol en cualquier momento". */
  market: string;
  /** The chosen selection within the market, e.g. "Real Madrid" / "Mbappé". */
  pick: string;
  odds: number;
};

export type Tier = 0 | 1 | 2 | 3 | 4;

export type TierConfig = {
  id: Tier;
  name: string;
  minOdds: number;
};
