import ExcelJS from "exceljs";
import { AccountType } from "@/utility/accounts/types";
import { TagType } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { faToEn, PreviewData } from "./excelConstants";

/**
 * Safely reads a cell value, handling rich text and formulas.
 *
 * @param cell - The cell to read.
 * @returns The cell's string value.
 */
function getCellVal(cell: any): string {
  if (!cell || cell.value === null || cell.value === undefined) return "";
  const v = cell.value;
  if (v.richText) {
    return v.richText.map((rt: any) => rt.text).join("");
  }
  if (typeof v === "object" && v.result !== undefined) return v.result;
  return String(v);
}

/**
 * Builds a map of category display names to their numeric IDs.
 *
 * @returns A map of "سرفصل - دسته‌بندی" to category ID.
 */
function buildCategoryNameToIdMap(): Map<string, number> {
  const map = new Map<string, number>();
  TransactionCategories.expense.forEach((group) => {
    group.sub.forEach((cat: any) => {
      map.set(`${group.name} - ${cat.name}`, cat.id);
    });
  });
  TransactionCategories.income.forEach((group) => {
    group.sub.forEach((cat: any) => {
      map.set(`${group.name} - ${cat.name}`, cat.id);
    });
  });
  return map;
}

/**
 * Parses an uploaded Excel file and extracts preview data.
 *
 * @param buffer - The uploaded file.
 * @param existingAccounts - The user's existing accounts.
 * @param existingTags - The user's existing tags.
 * @returns The parsed preview data.
 * @throws Error if the file structure is invalid.
 */
export async function parseExcelFile(
  buffer: ArrayBuffer,
  existingAccounts: AccountType[],
  existingTags: TagType[],
): Promise<PreviewData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws1 = wb.getWorksheet("حساب‌ها و برچسب‌ها");
  const ws3 = wb.getWorksheet("تراکنش‌ها");

  if (
    !ws1 ||
    String(getCellVal(ws1.getCell("A1"))) !== "ردیف" ||
    String(getCellVal(ws1.getCell("B1"))) !== "نام حساب" ||
    String(getCellVal(ws1.getCell("D1"))) !== "نوع حساب" ||
    String(getCellVal(ws1.getCell("F1"))) !== "رنگ حساب" ||
    String(getCellVal(ws1.getCell("I1"))) !== "نام برچسب" ||
    String(getCellVal(ws1.getCell("K1"))) !== "نوع برچسب" ||
    !ws3 ||
    String(getCellVal(ws3.getCell("A2"))) !== "تاریخ" ||
    String(getCellVal(ws3.getCell("B2"))) !== "ساعت" ||
    String(getCellVal(ws3.getCell("D2"))) !== "نام حساب" ||
    String(getCellVal(ws3.getCell("F2"))) !== "نام برچسب" ||
    String(getCellVal(ws3.getCell("H2"))) !== "نوع تراکنش" ||
    String(getCellVal(ws3.getCell("I2"))) !== "دسته‌بندی / مقصد" ||
    String(getCellVal(ws3.getCell("K2"))) !== "نام تراکنش" ||
    String(getCellVal(ws3.getCell("M2"))) !== "مبلغ"
  ) {
    throw new Error(
      "اکسل انتخاب‌شده منطبق با نمونه‌ی برنامه نیست، برای ورود داده با اکسل از نمونه‌ی برنامه استفاده کنین",
    );
  }

  /**
   * Reads a time cell, handling Date objects and strings.
   *
   * @param cell - The cell to read.
   * @returns The formatted time string.
   */
  const getCellTime = (cell: any): string => {
    if (
      !cell ||
      cell.value === null ||
      cell.value === undefined ||
      cell.value === ""
    )
      return "";

    let val = cell.value;
    if (val instanceof Date) {
      const h = val.getHours();
      const m = val.getMinutes();
      const s = val.getSeconds();
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return faToEn(String(val));
  };

  const categoryNameToId = buildCategoryNameToIdMap();
  const rawTransactions: any[] = [];

  ws3.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 3) return;

    const date = getCellVal(row.getCell(1));
    const time = getCellTime(row.getCell(2));
    const accountName = getCellVal(row.getCell(4));
    const tagName = getCellVal(row.getCell(6));

    let typeCode = getCellVal(row.getCell(7));
    if (!typeCode || typeof typeCode !== "string") {
      const typeName = getCellVal(row.getCell(8));
      if (typeName === "دریافت") typeCode = "debit";
      else if (typeName === "پرداخت") typeCode = "credit";
      else if (typeName === "انتقال") typeCode = "transfer";
      else if (typeName === "افتتاح") typeCode = "initial";
      else typeCode = "";
    }

    const catOrDestName = getCellVal(row.getCell(9));
    let catOrDestCode: any;

    if (catOrDestName === "") {
      catOrDestCode = undefined;
    } else if (typeCode === "transfer") {
      catOrDestCode = catOrDestName;
    } else {
      catOrDestCode = categoryNameToId.get(catOrDestName) ?? catOrDestName;
    }

    const txName = getCellVal(row.getCell(11));
    const note = getCellVal(row.getCell(12));
    const rawValue = getCellVal(row.getCell(13));

    const valueStr = faToEn(String(rawValue || "")).replace(/[^\d]/g, "");
    const value = valueStr ? parseInt(valueStr, 10) : 0;

    const isDateEmpty =
      !date || (typeof date === "string" && date.trim() === "");
    const isAccEmpty =
      !accountName ||
      (typeof accountName === "string" && accountName.trim() === "");

    if (isDateEmpty && isAccEmpty) return;

    rawTransactions.push({
      excelRow: rowNumber,
      date: faToEn(String(date || "")),
      time: faToEn(String(time || "")),
      accountName: String(accountName || ""),
      tagName: String(tagName || ""),
      catOrDestCode,
      type: typeCode,
      txName: txName ? String(txName) : "",
      note: note ? String(note) : "",
      value,
    });
  });

  const accList: any[] = [];
  const accMap = new Map<string, any>();

  ws1.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;

    const accName = getCellVal(row.getCell(2));
    const accId = getCellVal(row.getCell(3));
    const accType = getCellVal(row.getCell(4));
    const accColor = getCellVal(row.getCell(6));

    if (accName === "-" || accName === "") return;

    const existingAcc = existingAccounts.find((a) => a.id === accId);
    const isNew = !existingAcc;

    const accEntry = {
      name: accName,
      type: accType,
      color: accColor,
      isNew,
      needsUpdate:
        !isNew &&
        JSON.stringify(existingAcc) !==
          JSON.stringify({
            name: accName,
            type: accType,
            color: accColor,
          }),
      txCount: 0,
      finalBalance: 0,
      order: Number(getCellVal(row.getCell(1))) || 0,
      id: accId,
      default: existingAcc?.default ?? false,
    };

    if (!accMap.has(accName)) {
      accMap.set(accName, accEntry);
      accList.push(accEntry);
    }
  });

  const tagList: any[] = [];
  const tagMap = new Map<string, any>();

  ws1.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;

    const tagName = getCellVal(row.getCell(9));
    const tagId = getCellVal(row.getCell(10));

    if (tagName === "-" || tagName === "") return;

    const existingTag = existingTags.find((t) => t.id === tagId);
    const isNew = !existingTag;

    const tagEntry = {
      name: tagName,
      type: getCellVal(row.getCell(11)),
      isNew,
      needsUpdate: !isNew,
      txCount: 0,
      order: Number(getCellVal(row.getCell(8))) || 0,
      id: tagId,
    };

    if (!tagMap.has(tagName)) {
      tagMap.set(tagName, tagEntry);
      tagList.push(tagEntry);
    }
  });

  rawTransactions.forEach((tx) => {
    if (accMap.has(tx.accountName)) {
      const acc = accMap.get(tx.accountName);
      acc.txCount++;
      if (tx.type === "credit") acc.finalBalance -= tx.value;
      else acc.finalBalance += tx.value;
    }

    if (tx.type === "transfer") {
      const destKey = String(tx.catOrDestCode);
      if (accMap.has(destKey)) {
        const acc = accMap.get(destKey);
        acc.txCount++;
        acc.finalBalance += tx.value;
      }
    }

    if (tx.tagName && tx.tagName !== "") {
      if (tagMap.has(tx.tagName)) tagMap.get(tx.tagName).txCount++;
    }
  });

  const hasNewData =
    rawTransactions.length > 0 ||
    accList.some((a) => a.isNew) ||
    tagList.some((t) => t.isNew);

  if (!hasNewData) {
    throw new Error(
      "اکسل ارائه‌شده معتبر نیست؛ داده‌های خود را در نمونه‌ی معتبر وارد، و سپس بارگذاری کنید.",
    );
  }

  return {
    accounts: accList,
    tags: tagList,
    rawTransactions,
  };
}
