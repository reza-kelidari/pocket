import { jalaliToTimestamp, toJalaliDateArray } from "@/utility/time/methods";
import { create } from "domain";
import { type } from "os";
import { AccountType } from "../types";

export default async function getAccountsList(): Promise<AccountType[]> {
  return [
    {
      id: 0x01020000,
      name: "کیف پول نقدی",
      color: "orange",
      type: "Wallet",
      create: jalaliToTimestamp([toJalaliDateArray(new Date())[0], 1, 1]),
      default: true,
    },
    {
      id: 0x01020001,
      name: "سامان",
      color: "blue1",
      type: "Bank",
      create: jalaliToTimestamp([toJalaliDateArray(new Date())[0], 1, 1]),
    },
    {
      id: 0x01010000,
      name: "طلب‌ها",
      color: "green1",
      type: "Wallet",
      create: jalaliToTimestamp([toJalaliDateArray(new Date())[0], 1, 1]),
      default: true,
    },
    {
      id: 0x01010001,
      name: "بدهی‌ها",
      color: "red",
      type: "Wallet",
      create: jalaliToTimestamp([toJalaliDateArray(new Date())[0], 1, 1]),
      default: true,
    },
  ];
}
