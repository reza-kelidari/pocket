import { AccountType } from "@/utility/accounts/types";

export const generateNextId = (existingAccounts: AccountType[]): number => {
  if (existingAccounts.length === 0) {
    return 0x01020002;
  }

  const maxId = Math.max(...existingAccounts.map((acc) => acc.id));

  if (maxId >= 0x01020000 && maxId < 0x01020010) {
    return maxId + 1;
  }

  throw new Error("تعداد حساب‌ها از حد مجاز بیشتر شده است");
};
