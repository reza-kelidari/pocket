import { AccountType } from "@/utility/accounts/types";

export const generateNextId = (existingAccounts: AccountType[]): number => {
  if (existingAccounts.length === 0) {
    return 0x01020002; // اولین آیدی بعد از حساب‌های پیش‌فرض شما
  }

  const maxId = Math.max(...existingAccounts.map((acc) => acc.id));

  // محدوده فعلی شما (0x01020000 تا 0x01020010)
  if (maxId >= 0x01020000 && maxId < 0x01020010) {
    return maxId + 1;
  }

  // اگر از محدوده خارج شد (برای آینده)
  if (maxId < 0x01030000) {
    return maxId + 1;
  }

  throw new Error("تعداد حساب‌ها از حد مجاز بیشتر شده است");
};