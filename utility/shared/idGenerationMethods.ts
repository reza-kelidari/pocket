import { AccountType } from "@/utility/accounts/types";
import { TagType } from "../tags/type";

export const generateNextAccountId = (
  existingAccounts: AccountType[],
): number => {
  if (existingAccounts.length === 0) {
    return 0x01020002;
  }

  const maxId = Math.max(...existingAccounts.map((acc) => acc.id));

  if (maxId >= 0x01020000 && maxId < 0x01020010) {
    return maxId + 1;
  }

  throw new Error("تعداد حساب‌ها از حد مجاز بیشتر شده است");
};

export const generateNextTagId = (existingTags: TagType[]): number => {
  if (existingTags.length === 0) {
    return 0x01030000;
  }

  const maxId = Math.max(...existingTags.map((acc) => acc.id));

  return maxId + 1;
};
