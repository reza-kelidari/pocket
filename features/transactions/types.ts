export type TransactionType = {
  id: number;
  name: string;
  debit: number;
  credit: number;
  value: number;
  type: "normal" | "transform";
}