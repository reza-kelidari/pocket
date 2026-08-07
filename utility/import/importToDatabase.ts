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
      missing.push("کد دسته‌بندی / مقصد");
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
      if (!existsInUploaded)
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
      tagIdResolver.set(String(t.id), t.id);
    });

    const accCreateDateMap = new Map<string, number>();
    validTxs.forEach((tx) => {
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

      const accName = tx.accountName;
      if (
        accName &&
        (!accCreateDateMap.has(accName) ||
          time < accCreateDateMap.get(accName)!)
      ) {
        accCreateDateMap.set(accName, time);
      }

      if (tx.type === "transfer") {
        const destName = String(tx.catOrDestCode);
        if (
          destName &&
          (!accCreateDateMap.has(destName) ||
            time < accCreateDateMap.get(destName)!)
        ) {
          accCreateDateMap.set(destName, time);
        }
      }
    });

    const accountsToSave: AccountType[] = [];
    let newAccountsCount = 0;
    let updatedAccountsCount = 0;

    for (const acc of previewData.accounts) {
      if (acc.isNew && !accIdResolver.has(acc.name)) {
        const newId = crypto.randomUUID();
        const newAcc: AccountType = {
          id: newId,
          name: acc.name,
          type: acc.type as any,
          color: acc.color as any,
          default: false,
          order: acc.order,
        };
        accountsToSave.push(newAcc);
        accIdResolver.set(acc.name, newId);
        newAccountsCount++;
      } else if (acc.needsUpdate && acc.id) {
        const existingAcc = existingAccounts.find((a) => a.id === acc.id);
        if (existingAcc) {
          accountsToSave.push({
            ...existingAcc,
            type: acc.type as any,
            color: acc.color as any,
            order: existingAcc.name === "وجوه در راه" ? 999 : acc.order,
          });
          updatedAccountsCount++;
        }
      }
    }
    for (const chunk of chunkArray(accountsToSave, 50)) {
      await putItem(DatabaseStores.accountsStore, chunk);
    }

    const tagsToSave: TagType[] = [];
    let newTagsCount = 0;
    let updatedTagsCount = 0;

    for (const tag of previewData.tags) {
      if (tag.isNew && !tagIdResolver.has(tag.name)) {
        const newId = crypto.randomUUID();
        tagsToSave.push({
          id: newId,
          name: tag.name,
          type: tag.type as any,
          order: tag.order,
        });
        tagIdResolver.set(tag.name, newId);
        newTagsCount++;
      } else if (tag.needsUpdate && tag.id) {
        const existingTag = existingTags.find((t) => t.id === tag.id);
        if (existingTag) {
          tagsToSave.push({
            ...existingTag,
            type: tag.type as any,
            order: tag.order,
          });
          updatedTagsCount++;
        }
      }
    }
    for (const chunk of chunkArray(tagsToSave, 50)) {
      await putItem(DatabaseStores.tagsStore, chunk);
    }

    const txsToSave: any[] = [];
    const accountsWithInitial = new Set<string>();

    for (const tx of validTxs) {
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

      let debitId = "",
        creditId = "",
        tagId = "",
        catId = "";
      const accId = accIdResolver.get(tx.accountName) || "";
      const tId = tagIdResolver.get(tx.tagName) || "";

      if (tx.type !== "transfer" && tx.type !== "initial")
        catId = tx.catOrDestCode || 0;

      if (tx.type === "debit" || tx.type === "initial") {
        debitId = accId;
        creditId = catId;
      } else if (tx.type === "credit") {
        creditId = accId;
        debitId = catId;
      } else if (tx.type === "transfer") {
        creditId = accId;
        debitId = accIdResolver.get(String(tx.catOrDestCode)) || "";
      }
      tagId = tId;

      txsToSave.push({
        id: crypto.randomUUID(),
        time,
        name: tx.note || "",
        type: tx.type,
        debit: debitId,
        credit: creditId,
        value: tx.value,
        note: tx.note || "",
        tag: tagId,
      });

      if (tx.type === "initial" && debitId) accountsWithInitial.add(debitId);
    }

    for (const acc of previewData.accounts) {
      if (acc.isNew) {
        const newAccId = accIdResolver.get(acc.name);
        if (newAccId && !accountsWithInitial.has(newAccId)) {
          const firstTxTime = accCreateDateMap.get(acc.name) || Date.now();
          const initialTime = firstTxTime - 60000;
          txsToSave.push({
            id: crypto.randomUUID(),
            time: initialTime,
            name: "موجودی اولیه",
            type: "initial",
            debit: newAccId,
            credit: 0,
            value: 0,
            note: "",
            tag: 0,
          });
        }
      }
    }

    for (const chunk of chunkArray(txsToSave, 50)) {
      await putItem(DatabaseStores.transactionsStore, chunk);
    }

    const txCount = validTxs.length;
    const successMessage: MessageType = {
      title: "عملیات با موفقیت انجام شد",
      type: "done",
      message: [
        `${newAccountsCount.toLocaleString("fa-IR")} حساب جدید ایجاد شد`,
        `${updatedAccountsCount.toLocaleString("fa-IR")} حساب بروزرسانی شد`,
        `${newTagsCount.toLocaleString("fa-IR")} برچسب جدید ایجاد شد`,
        `${updatedTagsCount.toLocaleString("fa-IR")} برچسب بروزرسانی شد`,
        `با استفاده از موارد فوق، ${txCount.toLocaleString("fa-IR")} تراکنش افزوده شد`,
      ],
    };

    sessionStorage.setItem("message", JSON.stringify(successMessage));
    router.replace("/message");
  } catch (error: any) {
    console.error("Import error:", error);
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
