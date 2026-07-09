import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/transactions/types";
import {
  jalaliToTimestamp,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";

export function getDefaultAccounts(): AccountType[] {
  const startOfYear = jalaliToTimestamp([
    toJalaliDateArray(new Date())[0],
    1,
    1,
  ]);
  return [
    {
      id: 0x01020000,
      order: 1,
      name: "کیف پول نقدی",
      color: "orange",
      type: "Wallet",
      create: startOfYear,
      default: true,
    },
    {
      id: 0x01010000,
      order: 2,
      name: "طلب‌ها",
      color: "green1",
      type: "Wallet",
      create: startOfYear,
      default: true,
    },
    {
      id: 0x01010001,
      order: 3,
      name: "بدهی‌ها",
      color: "red",
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

  // کنترل جلوگیری از آیدی تکراری در زمان ایجاد دیتای اولیه
  let currentId = Date.now();

  return [
    {
      id: currentId++,
      time: startOfYear,
      name: "موجودی اولیه",
      debit: 0x01020000,
      credit: 0,
      value: 0,
      type: "initial",
      note: "",
    },
    {
      id: currentId++,
      time: startOfYear,
      name: "موجودی اولیه",
      debit: 0x01010000,
      credit: 0,
      value: 0,
      type: "initial",
      note: "",
    },
    {
      id: currentId++,
      time: startOfYear,
      name: "موجودی اولیه",
      debit: 0x01010001,
      credit: 0,
      value: 0,
      type: "initial",
      note: "",
    },
  ];
}
