/**
 * Represents the balance of an account at a specific point in time.
 *
 * This type is mainly used for generating balance history charts or
 * displaying historical account balances after each transaction.
 */
export type BalanceType = {
  /**
   * Unix timestamp (milliseconds) representing when the balance was recorded.
   */
  time: number;

  /**
   * Account balance immediately after the transaction at `time`.
   */
  balance: number;
};

/**
 * Represents the complete balance history for multiple accounts.
 *
 * Each item corresponds to a single account and contains its identifier
 * alongside an optional chronological balance history.
 *
 * @example
 * [
 *   {
 *     id: 1,
 *     history: [
 *       { time: 1710000000000, balance: 100000 },
 *       { time: 1710003600000, balance: 85000 }
 *     ]
 *   },
 *   {
 *     id: 2,
 *     history: []
 *   }
 * ]
 */
export type AccountBalanceType = {
  /**
   * Unique identifier of the account.
   */
  id: number;

  /**
   * Chronological balance history of the account.
   *
   * If omitted or empty, the account is considered to have no recorded
   * balance history.
   */
  history?: BalanceType[];
};
