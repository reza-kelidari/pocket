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
      name: "انتقال از کیف پول به سامان",
      debit: 101,
      credit: 100,
      value: 4000000,
      type: "transfer",
    },
    {
      id: 1783188255992,
      time: 1783188255992,
      name: "اصلاح موی سر",
      debit: 0x01070001,
      credit: 101,
      value: 2500000,
      type: "credit",
    },
    {
      id: 1783188165991,
      time: 1783188165991,
      name: "واریز حقوق",
      debit: 101,
      credit: 0x02010001,
      value: 208000000,
      type: "debit",
    },
  ];
}
