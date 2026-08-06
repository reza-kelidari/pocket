import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import {
  jalaliToTimestamp,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";
import { generateUUId } from "../shared/idGenerationMethods";

const walletID = generateUUId();

export function getDefaultAccounts(): AccountType[] {
  const startOfYear = jalaliToTimestamp([
    toJalaliDateArray(new Date())[0],
    1,
    1,
  ]);

  return [
    {
      id: "00000000-0000-4000-0000-000000000001",
      order: 1,
      name: "طلب‌ها",
      color: "green2",
      type: "Wallet",
      create: startOfYear,
      default: true,
    },
    {
      id: "00000000-0000-4000-0000-000000000002",
      order: 2,
      name: "بدهی‌ها",
      color: "red",
      type: "Wallet",
      create: startOfYear,
      default: true,
    },
    {
      id: "00000000-0000-4000-0000-000000000003",
      order: 999,
      name: "وجوه در راه",
      color: "black",
      type: "Wallet",
      create: startOfYear,
      default: true,
      hidden: true,
    },
    {
      id: walletID,
      order: 0,
      name: "کیف پول نقدی",
      color: "orange",
      type: "Wallet",
      create: startOfYear,
      default: true,
    },
  ];
}

export function getDefaultTransactions(): TransactionType[] {
  const startOfYear = jalaliToTimestamp([
    toJalaliDateArray(new Date())[0],
    1,
    1,
  ]);

  return [
    {
      id: crypto.randomUUID(),
      time: startOfYear,
      name: "موجودی اولیه",
      debit: walletID,
      credit: "",
      value: 0,
      type: "initial",
      note: "",
    },
    {
      id: crypto.randomUUID(),
      time: startOfYear,
      name: "موجودی اولیه",
      debit: "00000000-0000-4000-0000-000000000001",
      credit: "",
      value: 0,
      type: "initial",
      note: "",
    },
    {
      id: crypto.randomUUID(),
      time: startOfYear,
      name: "موجودی اولیه",
      debit: "00000000-0000-4000-0000-000000000002",
      credit: "",
      value: 0,
      type: "initial",
      note: "",
    },
  ];
}
