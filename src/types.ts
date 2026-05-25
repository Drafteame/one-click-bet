export type Selection = {
  id: string;
  match: string;
  pick: string;
  odds: number;
};

export type Tier = 0 | 1 | 2 | 3;

export type TierConfig = {
  id: Tier;
  name: string;
  minOdds: number;
};
