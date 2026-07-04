import { AccountType } from "../types";

export default async function getAccountsList(): Promise<AccountType[]> {
  return [
    {
      id: 100,
      name: "کیف پول نقدی",
      color: "orange",
      lastBalance: 10000000,
      type: "Wallet",
    },
    {
      id: 101,
      name: "سامان",
      color: "blue1",
      lastBalance: 10000000,
      type: "Bank",
    },
  ];
}
