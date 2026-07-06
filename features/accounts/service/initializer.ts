import { AccountType } from "../types";

export default async function getAccountsList(): Promise<AccountType[]> {
  return [
    {
      id: 0x01020000,
      name: "کیف پول نقدی",
      color: "orange",
      type: "Wallet",
    },
    {
      id: 0x01020001,
      name: "سامان",
      color: "blue1",
      type: "Bank",
    },
    {
      id: 0x01010000,
      name: "طلب‌ها",
      color: "green1",
      type: "Wallet",
    },
    {
      id: 0x01010001,
      name: "بدهی‌ها",
      color: "red",
      type: "Wallet",
    },
  ];
}
