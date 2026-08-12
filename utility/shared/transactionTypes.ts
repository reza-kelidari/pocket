export const TransactionKinds = ["debit", "credit", "transfer", "initial"] as const;

/**
 * Represents the kind of financial transaction.
 *
 * - `debit`    : Money received by an account.
 * - `credit`   : Money paid from an account.
 * - `transfer` : Money transferred between two accounts.
 * - `initial`  : Initial account balance.
 */
export type TransactionKindType = typeof TransactionKinds[number];

/**
 * Represents a financial transaction.
 */
export type TransactionType = {
  /** Unique transaction identifier. */
  id: string;

  /** Unix timestamp representing when the transaction occurred. */
  time: number;

  /** User-defined transaction title or description. */
  name: string;

  /** Identifier of the debit (destination) account. */
  debit: string;

  /** Identifier of the credit (source) account. */
  credit: string;

  /** Transaction amount. */
  value: number;

  /** Transaction kind. */
  type: TransactionKindType;

  tag?: string;

  note?: string;
};
