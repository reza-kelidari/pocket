import { AccountType } from "@/utility/accounts/types";
import { TransactionType } from "@/utility/shared/transactionTypes";
import {
  jalaliToTimestamp,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";
import { generateUUId } from "../shared/idGenerationMethods";

const walletID = generateUUId();
const debitsID = generateUUId();
const creditsID = generateUUId();

export function getDefaultAccounts(): AccountType[] {
  return [
    {
      id: debitsID,
      order: 1,
      name: "طلب‌ها",
      color: "green2",
      type: "Wallet",
      default: true,
    },
    {
      id: creditsID,
      order: 2,
      name: "بدهی‌ها",
      color: "red",
      type: "Wallet",
      default: true,
    },
    {
      id: generateUUId(),
      order: 999,
      name: "وجوه در راه",
      color: "black",
      type: "Wallet",
      default: true,
      hidden: true,
    },
    {
      id: walletID,
      order: 0,
      name: "کیف پول نقدی",
      color: "orange",
      type: "Wallet",
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
      debit: debitsID,
      credit: "",
      value: 0,
      type: "initial",
      note: "",
    },
    {
      id: crypto.randomUUID(),
      time: startOfYear,
      name: "موجودی اولیه",
      debit: creditsID,
      credit: "",
      value: 0,
      type: "initial",
      note: "",
    },
  ];
}
