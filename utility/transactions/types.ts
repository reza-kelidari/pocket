
/**
 * Represents the kind of financial transaction.
 *
 * - `debit`    : Money received by an account.
 * - `credit`   : Money paid from an account.
 * - `transfer` : Money transferred between two accounts.
 * - `initial`  : Initial account balance.
 */
export type TransactionKindType =
  | "debit"
  | "credit"
  | "transfer"
  | "initial";

/**
 * Represents a financial transaction.
 */
export type TransactionType = {
  /** Unique transaction identifier. */
  id: number;

  /** Unix timestamp representing when the transaction occurred. */
  time: number;

  /** User-defined transaction title or description. */
  name: string;

  /** Identifier of the debit (destination) account. */
  debit: number;

  /** Identifier of the credit (source) account. */
  credit: number;

  /** Transaction amount. */
  value: number;

  /** Transaction kind. */
  type: TransactionKindType;

  tag?: number;

  note?: string;
};

