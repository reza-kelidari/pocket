import { AccountBalanceType, BalancePointType } from "./types";

/**
 * Creates a map of account IDs to their latest balances.
 *
 * Each account is mapped to the most recent balance in its history. If an
 * account has no balance history, its balance defaults to `0`.
 *
 * @param balances Collection of account balance histories.
 * @returns An array of objects that contains account ID, time and the latest balance.
 */
export function getBalancePoints(
  balances: AccountBalanceType,
): BalancePointType[] {
  const b: BalancePointType[] = [];
  balances.map((item) =>
    b.push({
      id: item.id,
      time: item.history?.at(-1)?.time ?? 0,
      balance: item.history?.at(-1)?.balance ?? 0,
    }),
  );

  return b;
}

/**
 * Calculates the total balance across all accounts.
 *
 * @param balancePoints Map of account IDs to their latest balances.
 * @returns The sum of all account balances.
 */
export function getTotalBalances(balancePoints: BalancePointType[]): number {
  return [...balancePoints.values()].reduce(
    (sum, item) => sum + item.balance,
    0,
  );
}
