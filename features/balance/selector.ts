import { AccountBalanceType } from "./types";

/**
 * Calculates the total balance across all accounts.
 *
 * @param balancePoints Map of account IDs to their latest balances.
 * @returns The sum of all account balances.
 */
export function getTotalBalances(balancePoints: AccountBalanceType[]): number {
  let balance = 0;

  balancePoints.forEach(
    (item) => (balance += item.history?.at(-1)?.balance ?? 0),
  );
  return balance;
}
