import { TransactionType } from "../types";

export default async function getTransactionsList(): Promise<
  TransactionType[]
> {
  return [
    {
      id: 1783188055991,
      time: 1783188055991,
      name: "",
      debit: 100,
      credit: 0,
      value: 45000000,
      type: "initial",
    },
    {
      id: 1783188055992,
      time: 1783188055992,
      name: "",
      debit: 101,
      credit: 0,
      value: 40000000,
      type: "initial",
    },
    {
      id: 1783188155991,
      time: 1783188155991,
      name: "",
      debit: 100,
      credit: 101,
      value: 10000,
      type: "transfer",
    },
    {
      id: 1783188255992,
      time: 1783188255992,
      name: "",
      debit: 0x01070001,
      credit: 101,
      value: 10000000,
      type: "normal",
    },
  ];
}
