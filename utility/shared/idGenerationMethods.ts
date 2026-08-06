import { AccountType } from "@/utility/accounts/types";
import { TagType } from "./tagTypes";

export const generateNextAccountId = (
  existingAccounts: AccountType[],
): number => {
  if (existingAccounts.length === 0) {
    return 0x01020002;
  }

  const maxId = Math.max(...existingAccounts.map((acc) => Number(acc.id)));

  if (maxId >= 0x01020000 && maxId < 0x01020010) {
    return maxId + 1;
  }

  throw new Error("تعداد حساب‌ها از حد مجاز بیشتر شده است");
};

export const generateNextTagId = (existingTags: TagType[]): number => {
  if (existingTags.length === 0) {
    return 0x01030000;
  }

  const maxId = Math.max(...existingTags.map((acc) => Number(acc.id)));

  return maxId + 1;
};

export const generateUUId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
