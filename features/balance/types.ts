export type BalanceType = { time: number; balance: number };

export type AccountBalance = {
  id: number;
  history?: BalanceType[];
}[];
