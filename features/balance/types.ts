export type BalanceType = { time: number; balance: number };

export type AccountBalanceType = {
  id: number;
  history?: BalanceType[];
}[];

export type BalancesMapType = Map<number, number>;
