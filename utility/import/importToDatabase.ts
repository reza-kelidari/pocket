import { DatabaseStores } from "@/utility/keys/database";
import { putItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { jalaliToTimestamp } from "@/utility/shared/timeMethods";
import { MessageType } from "@/app/message/page";
import { PreviewData } from "./excelConstants";

/**
 * Splits an array into chunks of a specified size.
 *
 * @param array - The array to split.
 * @param size - The chunk size.
 * @returns An array of chunks.
 */
const chunkArray = (array: any[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

/**
 * Imports parsed Excel data into the database.
 *
 * @param previewData - The parsed preview data from Excel.
 * @param existingAccounts - The user's existing accounts.
 * @param existingTags - The user's existing tags.
 * @param router - The Next.js router instance.
 */
export async function importDataToDatabase(
  previewData: PreviewData,
  existingAccounts: AccountType[],
  existingTags: TagType[],
  router: any,
) {
  const validCategoryIds = new Set<any>();
  TransactionCategories.expense.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );
  TransactionCategories.income.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );

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

  if (errors.length > 0) {
    const message: MessageType = {
      title: "خطا در ورود اطلاعات",
      type: "error",
      message: errors,
    };
    sessionStorage.setItem("message", JSON.stringify(message));
    router.replace("/message");
    return;
  }

  try {
    const accIdResolver = new Map<string, string>();
    const tagIdResolver = new Map<string, string>();

    existingAccounts.forEach((a) => {
      accIdResolver.set(a.name, a.id);
      accIdResolver.set(a.id, a.id);
    });
    existingTags.forEach((t) => {
      tagIdResolver.set(t.name, t.id);
      tagIdResolver.set(t.id, t.id);
    });

    previewData.accounts.forEach((a) => {
      accIdResolver.set(a.name, a.id);
      accIdResolver.set(a.id, a.id);
    });
    previewData.tags.forEach((t) => {
      tagIdResolver.set(t.name, t.id);
      tagIdResolver.set(t.id, t.id);
    });

    const { accountsStore, transactionsStore, tagsStore } = DatabaseStores;

    const newAccounts = previewData.accounts.filter((a) => a.isNew);
    for (const chunk of chunkArray(newAccounts, 50)) {
      await putItem(accountsStore, chunk);
    }

    const newTags = previewData.tags.filter((t) => t.isNew);
    for (const chunk of chunkArray(newTags, 50)) {
      await putItem(tagsStore, chunk);
    }

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

      if (tx.tagName) {
        tagId = tagIdResolver.get(tx.tagName);
      }

      if (tx.type === "debit" || tx.type === "initial") {
        debitId = accId;
        creditId = tx.catOrDestCode;
      } else if (tx.type === "credit") {
        creditId = accId;
        debitId = tx.catOrDestCode;
      } else if (tx.type === "transfer") {
        debitId = accId;
        creditId = accIdResolver.get(String(tx.catOrDestCode)) ?? "";
      }

      txsToSave.push({
        id: crypto.randomUUID(),
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

    for (const chunk of chunkArray(txsToSave, 50)) {
      await putItem(transactionsStore, chunk);
    }

    const message: MessageType = {
      title: "ورود اطلاعات موفق",
      type: "done",
      message: [
        `اطلاعات ${previewData.accounts.filter((a) => a.isNew).length} حساب جدید، ${previewData.tags.filter((t) => t.isNew).length} برچسب جدید و ${txsToSave.length} تراکنش با موفقیت وارد شد.`,
      ],
    };
    sessionStorage.setItem("message", JSON.stringify(message));
    router.replace("/message");
  } catch (error: any) {
    const errorMessage: MessageType = {
      title: "خطای سیستم",
      type: "error",
      message: [
        "خطایی هنگام ثبت اطلاعات در دیتابیس رخ داده است.",
        error.message || "",
      ],
    };
    sessionStorage.setItem("message", JSON.stringify(errorMessage));
    router.replace("/message");
  }
}
