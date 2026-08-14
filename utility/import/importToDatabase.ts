import { DatabaseStores } from "@/utility/keys/database";
import { putItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { jalaliToTimestamp } from "@/utility/shared/timeMethods";
import { MessageType } from "@/app/message/page";
import { PreviewData } from "./excelConstants";

const chunkArray = (array: any[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

export type ImportProgressCallback = (
  progress: number,
  stepText: string,
) => void;

/**
 * Imports parsed Excel data into the database.
 * Returns a MessageType result — the caller is responsible for
 * storing it in sessionStorage and navigating to /message.
 */
export async function importDataToDatabase(
  previewData: PreviewData,
  existingAccounts: AccountType[],
  existingTags: TagType[],
  onProgress?: ImportProgressCallback,
): Promise<MessageType> {
  const report = (p: number, s: string) => {
    onProgress?.(p, s);
  };

  report(5, "در حال اعتبارسنجی تراکنش‌ها...");

  const validCategoryIds = new Set<any>();
  TransactionCategories.expense.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );
  TransactionCategories.income.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );
  // Build account type lookup for tag-on-transfer validation
  const accTypeMap = new Map<string, string>();
  existingAccounts.forEach((a) => accTypeMap.set(a.name, a.type));
  previewData.accounts.forEach((a) => accTypeMap.set(a.name, a.type));
  const errors: string[] = [];
  const validTypes = ["debit", "credit", "transfer", "initial"];

  const validTxs = previewData.rawTransactions.filter((tx) => {
    const hasDate = tx.date && String(tx.date).trim() !== "";
    const hasAcc = tx.accountName && String(tx.accountName).trim() !== "";
    return hasDate || hasAcc;
  });

  for (const tx of validTxs) {
    const missing: string[] = [];
    if (!tx.date) missing.push("تاریخ");
    if (!tx.time && tx.type !== "initial") missing.push("ساعت");
    if (!tx.accountName) missing.push("نام حساب");
    if (!tx.type || !validTypes.includes(tx.type)) missing.push("نوع تراکنش");
    if (tx.type === "initial" && tx.tagName && tx.tagName.trim() !== "") {
      missing.push("برچسب (مجاز نیست)");
    }
    if (tx.type === "transfer" && tx.tagName && tx.tagName.trim() !== "") {
      const sourceType = accTypeMap.get(tx.accountName) || "";
      const destType = accTypeMap.get(String(tx.catOrDestCode)) || "";
      if (sourceType !== "Book" && destType !== "Book") {
        missing.push("برچسب (مجاز نیست)");
      }
    }
    if (
      tx.type !== "initial" &&
      (tx.catOrDestCode === undefined || tx.catOrDestCode === "")
    ) {
      missing.push("دسته‌بندی / مقصد");
    }
    if (
      tx.value === undefined ||
      tx.value === null ||
      tx.value < 0 ||
      (tx.value === 0 && tx.type !== "initial")
    ) {
      missing.push("مبلغ");
    }
    if (missing.length > 0) {
      errors.push(
        `در ردیف ${tx.excelRow} فایل اکسل، مشخصه‌ی ${missing.join("، ")} به درستی وارد نشده‌است.`,
      );
      continue;
    }
    if (tx.type === "transfer") {
      const destName = String(tx.catOrDestCode);
      const existsInUploaded = previewData.accounts.some(
        (a) => a.name === destName,
      );
      const existsInExisting = existingAccounts.some(
        (a) => a.name === destName,
      );
      if (!existsInUploaded && !existsInExisting)
        errors.push(
          `در ردیف ${tx.excelRow} از حساب مقصد نامعتبری استفاده شده است.`,
        );
    } else if (tx.type === "credit" || tx.type === "debit") {
      if (!validCategoryIds.has(tx.catOrDestCode))
        errors.push(
          `در ردیف ${tx.excelRow} از دسته‌بندی نامعتبری استفاده شده است.`,
        );
    }
  }

  // ─── خطای اعتبارسنجی: فقط نتیجه رو برمی‌گردونیم ───
  if (errors.length > 0) {
    return {
      title: "خطا در ورود اطلاعات",
      type: "error",
      message: errors,
    };
  }

  try {
    const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

    // ═══════════════════════════════════════════════════════════
    // ۱) ذخیره‌ی حساب‌ها — id جدید توسط دیتابیس تولید می‌شود
    // ═══════════════════════════════════════════════════════════
    report(15, "در حال ذخیره‌ی حساب‌ها...");

    const accountsToSave: any[] = [];
    const newAccountNameAt = new Map<number, string>();
    let accIdx = 0;

    for (const a of previewData.accounts) {
      if (a.isNew) {
        accountsToSave.push({
          id: "",
          name: a.name,
          type: a.type,
          color: a.color,
          order: a.order,
          default: a.default ?? false,
          hidden: false,
        });
        newAccountNameAt.set(accIdx, a.name);
        accIdx++;
      } else if (a.needsUpdate) {
        const existing = existingAccounts.find((e) => e.id === a.id);
        if (existing) {
          accountsToSave.push({
            ...existing,
            name: a.name,
            type: a.type || existing.type,
            color: a.color || existing.color,
            order: a.order,
          });
          accIdx++;
        }
      }
    }

    const savedAccountIds: string[] = [];
    if (accountsToSave.length > 0) {
      for (const chunk of chunkArray(accountsToSave, 50)) {
        const ids = await putItem(accountsStore, chunk);
        savedAccountIds.push(...ids);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ۲) ذخیره‌ی برچسب‌ها — id جدید توسط دیتابیس تولید می‌شود
    // ═══════════════════════════════════════════════════════════
    report(30, "در حال ذخیره‌ی برچسب‌ها...");

    const tagsToSave: any[] = [];
    const newTagNameAt = new Map<number, string>();
    let tagIdx = 0;

    for (const t of previewData.tags) {
      if (t.isNew) {
        tagsToSave.push({
          id: "",
          name: t.name,
          type: t.type,
          order: t.order,
        });
        newTagNameAt.set(tagIdx, t.name);
        tagIdx++;
      } else if (t.needsUpdate) {
        const existing = existingTags.find((e) => e.id === t.id);
        if (existing) {
          tagsToSave.push({
            ...existing,
            name: t.name,
            type: t.type || existing.type,
            order: t.order,
          });
          tagIdx++;
        }
      }
    }

    const savedTagIds: string[] = [];
    if (tagsToSave.length > 0) {
      for (const chunk of chunkArray(tagsToSave, 50)) {
        const ids = await putItem(tagsStore, chunk);
        savedTagIds.push(...ids);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ۳) ساخت Resolver با id‌های واقعی (برگشته از دیتابیس)
    // ═══════════════════════════════════════════════════════════
    report(40, "در حال ساخت نگاشت شناسه‌ها...");

    const accIdResolver = new Map<string, string>();
    const tagIdResolver = new Map<string, string>();

    existingAccounts.forEach((a) => {
      accIdResolver.set(a.name, a.id);
      accIdResolver.set(a.id, a.id);
    });
    previewData.accounts
      .filter((a) => !a.isNew)
      .forEach((a) => {
        accIdResolver.set(a.name, a.id);
      });
    for (const [idx, name] of newAccountNameAt.entries()) {
      const newId = savedAccountIds[idx];
      if (newId) {
        accIdResolver.set(name, newId);
      }
    }

    existingTags.forEach((t) => {
      tagIdResolver.set(t.name, t.id);
      tagIdResolver.set(t.id, t.id);
    });
    previewData.tags
      .filter((t) => !t.isNew)
      .forEach((t) => {
        tagIdResolver.set(t.name, t.id);
      });
    for (const [idx, name] of newTagNameAt.entries()) {
      const newId = savedTagIds[idx];
      if (newId) {
        tagIdResolver.set(name, newId);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // ۴) ساخت و ذخیره‌ی تراکنش‌ها — id توسط دیتابیس تولید می‌شود
    // ═══════════════════════════════════════════════════════════
    report(55, "در حال پردازش تراکنش‌ها...");

    const txsToSave: any[] = [];
    for (const tx of validTxs) {
      const accId = accIdResolver.get(tx.accountName);
      if (!accId) continue;

      const [y, m, d] = String(tx.date).split("/").map(Number);
      const timeStr =
        tx.type === "initial" ? "00:00:00" : String(tx.time || "00:00");
      let h = 0,
        min = 0,
        s = 0;
      if (timeStr.includes(":")) {
        const parts = timeStr.split(":").map(Number);
        h = parts[0] || 0;
        min = parts[1] || 0;
        s = parts[2] || 0;
      } else if (!isNaN(Number(timeStr))) {
        const fraction = Number(timeStr);
        if (fraction > 0 && fraction < 1) {
          const totalSeconds = Math.round(fraction * 24 * 3600);
          h = Math.floor(totalSeconds / 3600);
          min = Math.floor((totalSeconds % 3600) / 60);
          s = totalSeconds % 60;
        }
      }
      const time =
        jalaliToTimestamp([y, m, d]) + h * 3600000 + min * 60000 + s * 1000;

      let debitId = "";
      let creditId = "";
      let tagId: string | undefined = undefined;

      if (tx.tagName && tx.type !== "initial") {
        tagId = tagIdResolver.get(tx.tagName);
      }

      if (tx.type === "debit" || tx.type === "initial") {
        debitId = accId;
        creditId = tx.catOrDestCode;
      } else if (tx.type === "credit") {
        creditId = accId;
        debitId = tx.catOrDestCode;
      } else if (tx.type === "transfer") {
        creditId = accId;
        debitId = accIdResolver.get(String(tx.catOrDestCode)) ?? "";
      }

      txsToSave.push({
        id: "",
        time,
        name: tx.txName || "",
        type: tx.type,
        debit: debitId,
        credit: creditId,
        value: tx.value,
        note: tx.note || "",
        tag: tagId,
      });
    }

    report(70, "در حال ذخیره‌ی تراکنش‌ها...");
    const txChunks = chunkArray(txsToSave, 50);
    for (let i = 0; i < txChunks.length; i++) {
      await putItem(transactionsStore, txChunks[i]);
      const chunkProgress = 70 + Math.round(((i + 1) / txChunks.length) * 20);
      report(
        chunkProgress,
        `در حال ذخیره‌ی تراکنش‌ها (${(i + 1).toLocaleString("fa-ir")}/${txChunks.length.toLocaleString("fa-ir")})...`,
      );
    }

    report(95, "در حال نهایی‌سازی...");

    const newAccountsCount = previewData.accounts.filter((a) => a.isNew).length;
    const updatedAccountsCount = previewData.accounts.filter(
      (a) => a.needsUpdate,
    ).length;
    const newTagsCount = previewData.tags.filter((t) => t.isNew).length;
    const updatedTagsCount = previewData.tags.filter(
      (t) => t.needsUpdate,
    ).length;

    report(100, "تکمیل شد");

    return {
      title: "ورود اطلاعات موفق",
      type: "done",
      message: [
        `اطلاعات ${newAccountsCount.toLocaleString("fa-ir")} حساب جدید، ${updatedAccountsCount.toLocaleString("fa-ir")} حساب بروزرسانی‌شده، ${newTagsCount.toLocaleString("fa-ir")} برچسب جدید، ${updatedTagsCount.toLocaleString("fa-ir")} برچسب بروزرسانی‌شده و ${txsToSave.length.toLocaleString("fa-ir")} تراکنش با موفقیت وارد شد.`,
      ],
    };
  } catch (error: any) {
    return {
      title: "خطای سیستم",
      type: "error",
      message: [
        "خطایی هنگام ثبت اطلاعات در دیتابیس رخ داده است.",
        error.message || "",
      ],
    };
  }
}
