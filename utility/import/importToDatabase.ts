import { DatabaseStores } from "@/utility/keys/database";
import { putItem } from "@/utility/db/Database";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { jalaliToTimestamp } from "@/utility/shared/timeMethods";
import { MessageType } from "@/app/message/page";
import { PreviewData } from "./excelConstants";

/**
 * Splits an array into smaller chunks of a specified size.
 *
 * @param array - The array to split into chunks.
 * @param size - The maximum number of elements per chunk.
 * @returns An array of chunk arrays.
 */
const chunkArray = (array: any[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

/**
 * Imports parsed Excel data into the local database.
 *
 * This function performs the following operations:
 * 1. Validates all transactions for required fields and referential integrity.
 * 2. Creates or updates accounts based on the parsed data.
 * 3. Creates or updates tags based on the parsed data.
 * 4. Creates transaction records with resolved foreign key references.
 *
 * On success, navigates to the message page with a success summary.
 * On validation errors, navigates to the message page with error details.
 *
 * @param previewData - The parsed preview data from the uploaded Excel file.
 * @param existingAccounts - The user's existing accounts in the database.
 * @param existingTags - The user's existing tags in the database.
 * @param router - The Next.js router instance for navigation.
 * @returns A promise that resolves when the import is complete or redirected.
 */
export async function importDataToDatabase(
  previewData: PreviewData,
  existingAccounts: AccountType[],
  existingTags: TagType[],
  router: any,
) {
  // Build a set of valid category IDs for transaction validation
  const validCategoryIds = new Set<any>();
  TransactionCategories.expense.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );
  TransactionCategories.income.forEach((g) =>
    g.sub.forEach((s) => validCategoryIds.add(s.id)),
  );

  const errors: string[] = [];
  const validTypes = ["debit", "credit", "transfer", "initial"];

  // Filter out completely empty rows
  const validTxs = previewData.rawTransactions.filter((tx) => {
    const hasDate = tx.date && String(tx.date).trim() !== "";
    const hasAcc = tx.accountName && String(tx.accountName).trim() !== "";
    return hasDate || hasAcc;
  });

  // Validate each transaction
  for (const tx of validTxs) {
    const missing: string[] = [];

    if (!tx.date) missing.push("تاریخ");
    if (!tx.time && tx.type !== "initial") missing.push("ساعت");
    if (!tx.accountName) missing.push("نام حساب");
    if (!tx.type || !validTypes.includes(tx.type)) missing.push("نوع تراکنش");

    // Tags are not allowed for initial and transfer transactions
    if (
      (tx.type === "initial" || tx.type === "transfer") &&
      tx.tagName &&
      tx.tagName.trim() !== ""
    ) {
      missing.push("برچسب (مجاز نیست)");
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

    // Validate transfer destination exists
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
      // Validate category exists for income/expense transactions
      if (!validCategoryIds.has(tx.catOrDestCode))
        errors.push(
          `در ردیف ${tx.excelRow} از دسته‌بندی نامعتبری استفاده شده است.`,
        );
    }
  }

  // Redirect to message page on validation errors
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
    // Build resolvers for mapping names to IDs
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

    // Save new and updated accounts in batches
    const accountsToSave: any[] = [];
    for (const a of previewData.accounts) {
      if (a.isNew) {
        accountsToSave.push({
          id: a.id || crypto.randomUUID(),
          name: a.name,
          type: a.type,
          color: a.color,
          order: a.order,
          default: a.default ?? false,
          hidden: false,
        });
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
        }
      }
    }

    for (const chunk of chunkArray(accountsToSave, 50)) {
      await putItem(accountsStore, chunk);
    }

    // Save new and updated tags in batches
    const tagsToSave: any[] = [];
    for (const t of previewData.tags) {
      if (t.isNew) {
        tagsToSave.push({
          id: t.id || crypto.randomUUID(),
          name: t.name,
          type: t.type,
          order: t.order,
        });
      } else if (t.needsUpdate) {
        const existing = existingTags.find((e) => e.id === t.id);
        if (existing) {
          tagsToSave.push({
            ...existing,
            name: t.name,
            type: t.type || existing.type,
            order: t.order,
          });
        }
      }
    }

    for (const chunk of chunkArray(tagsToSave, 50)) {
      await putItem(tagsStore, chunk);
    }

    // Build and save transaction records
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

      // Parse time from string format (HH:MM:SS)
      if (timeStr.includes(":")) {
        const parts = timeStr.split(":").map(Number);
        h = parts[0] || 0;
        min = parts[1] || 0;
        s = parts[2] || 0;
      } else if (!isNaN(Number(timeStr))) {
        // Parse time from fractional day format (Excel stores time as fraction of day)
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

      // Resolve tag ID (skip for initial and transfer transactions)
      if (tx.tagName && tx.type !== "initial" && tx.type !== "transfer") {
        tagId = tagIdResolver.get(tx.tagName);
      }

      // Determine debit and credit account IDs based on transaction type
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

    // Save transactions in batches
    for (const chunk of chunkArray(txsToSave, 50)) {
      await putItem(transactionsStore, chunk);
    }

    // Calculate summary statistics
    const newAccountsCount = previewData.accounts.filter((a) => a.isNew).length;
    const updatedAccountsCount = previewData.accounts.filter(
      (a) => a.needsUpdate,
    ).length;
    const newTagsCount = previewData.tags.filter((t) => t.isNew).length;
    const updatedTagsCount = previewData.tags.filter(
      (t) => t.needsUpdate,
    ).length;

    // Redirect to message page with success summary
    const message: MessageType = {
      title: "ورود اطلاعات موفق",
      type: "done",
      message: [
        `اطلاعات ${newAccountsCount} حساب جدید، ${updatedAccountsCount} حساب بروزرسانی‌شده، ${newTagsCount} برچسب جدید، ${updatedTagsCount} برچسب بروزرسانی‌شده و ${txsToSave.length} تراکنش با موفقیت وارد شد.`,
      ],
    };
    sessionStorage.setItem("message", JSON.stringify(message));
    router.replace("/message");
  } catch (error: any) {
    // Redirect to message page on system error
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
