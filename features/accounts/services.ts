import { AccountType } from "./types";

export async function getAccountsList(): Promise<AccountType[]> {
  await new Promise((r) => setTimeout(r, 2000));

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
