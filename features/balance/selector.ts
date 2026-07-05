import { AccountBalanceType, BalancesMapType } from "./types";

export function getBalancesMap(balances: AccountBalanceType): BalancesMapType {
  return new Map(
    balances.map((item) => [item.id, item.history?.at(-1)?.balance ?? 0]),
  );
}

export function getTotalBalances(balancesMap: BalancesMapType) {
  return [...balancesMap.values()].reduce((sum, balance) => sum + balance, 0);
}
