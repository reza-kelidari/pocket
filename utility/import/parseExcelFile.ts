import ExcelJS from "exceljs";
import { AccountType } from "@/utility/accounts/types";
import { TagItemTypes, TagType } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountColors } from "@/utility/shared/colors";
import { faToEn, PreviewData } from "./excelConstants";

/**
 * Safely reads a cell value, handling rich text, formulas, and various data types.
 *
 * @param cell - The ExcelJS cell object to read.
 * @returns The cell's value as a string, or empty string if unreadable.
 */
function getCellVal(cell: any): string {
  if (!cell || cell.value === null || cell.value === undefined) return "";
  const v = cell.value;
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return String(v);
  }
  if (v.richText) {
    return v.richText.map((rt: any) => rt.text).join("");
  }
  if (typeof v === "object") {
    // Return the calculated result of a formula, not the formula itself
    if (v.result !== undefined) return String(v.result);
    // Skip cells with unresolved formulas
    if (v.formula !== undefined || v.sharedFormula !== undefined) return "";
    return "";
  }
  return "";
}

/**
 * Builds a map of category display names to their numeric IDs.
 * The display format is "Group Name - Category Name".
 *
 * @returns A map from category display name to its numeric ID.
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
 * Parses an uploaded Excel file and extracts preview data for import confirmation.
 *
 * The function reads two sheets:
 * - "حساب‌ها و برچسب‌ها": Extracts account and tag definitions with their internal codes.
 * - "تراکنش‌ها": Extracts transaction rows with dates, amounts, and references.
 *
 * For accounts and tags, it determines whether each entry is new or needs updating
 * by comparing against existing data. Type and color codes are resolved from either
 * the hidden code columns (via VLOOKUP results) or by translating Persian names.
 *
 * @param buffer - The uploaded Excel file as an ArrayBuffer.
 * @param existingAccounts - The user's existing accounts for comparison.
 * @param existingTags - The user's existing tags for comparison.
 * @returns A promise resolving to the parsed preview data.
 * @throws Error if the file structure doesn't match the expected template.
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

  // Validate sheet structure by checking header cells
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
   * Reads a time cell, handling Date objects, day fractions, and string formats.
   *
   * Excel may store time values in three ways:
   * - Date object: Extracted using UTC methods to avoid timezone issues.
   * - Fractional number: e.g., 0.5 = 12:00, 0.25 = 06:00 (fraction of a day).
   * - String: e.g., "12:00" or "۱۲:۰۰" with Persian digits.
   *
   * @param cell - The ExcelJS cell object containing the time value.
   * @returns The time formatted as "HH:MM:SS", or empty string if blank.
   */
  const getCellTime = (cell: any): string => {
    if (
      !cell ||
      cell.value === null ||
      cell.value === undefined ||
      cell.value === ""
    )
      return "";
    const val = cell.value;

    if (val instanceof Date) {
      const h = val.getUTCHours();
      const m = val.getUTCMinutes();
      const s = val.getUTCSeconds();
      return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    const num = Number(val);
    if (!isNaN(num)) {
      const fraction = num - Math.floor(num);
      if (fraction > 0 || num === 0) {
        const totalSeconds = Math.round(fraction * 24 * 3600);
        const h = Math.floor(totalSeconds / 3600);
        const min = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
      }
    }

    return faToEn(String(val));
  };

  // Build lookup maps: Persian display name -> internal code
  // Note: "پیش‌فرض" (Default) is intentionally NOT mapped here.
  // For default accounts, the existing type/color from the database is preserved.
  const typeNameToCode = new Map<string, string>();
  Object.entries(AccountTypes).forEach(([key, type]: [string, any]) => {
    typeNameToCode.set(type.name, key);
  });

  const colorNameToCode = new Map<string, string>();
  Object.entries(AccountColors).forEach(([key, color]: [string, any]) => {
    colorNameToCode.set(color.name, key);
  });

  const tagTypeNameToCode = new Map<string, string>();
  TagItemTypes.forEach((t: any) => {
    tagTypeNameToCode.set(t.label, t.value);
  });

  const categoryNameToId = buildCategoryNameToIdMap();
  const rawTransactions: any[] = [];

  // Parse transaction rows from sheet 2
  ws3.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 3) return;

    const date = getCellVal(row.getCell(1));
    const time = getCellTime(row.getCell(2));
    const accountName = getCellVal(row.getCell(4));
    const tagName = getCellVal(row.getCell(6));

    // Resolve transaction type code from hidden column or display name
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
      // For transfers, the destination is an account name (resolved later)
      catOrDestCode = catOrDestName;
    } else {
      // For income/expense, resolve category name to its numeric ID
      catOrDestCode = categoryNameToId.get(catOrDestName) ?? catOrDestName;
    }

    const txName = getCellVal(row.getCell(11));
    const note = getCellVal(row.getCell(12));
    const rawValue = getCellVal(row.getCell(13));

    const valueStr = faToEn(String(rawValue || "")).replace(/[^\d]/g, "");
    const value = valueStr ? parseInt(valueStr, 10) : 0;

    // Skip completely empty rows
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

  // Parse account rows from sheet 1
  ws1.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;

    const accName = getCellVal(row.getCell(2));
    const accId = getCellVal(row.getCell(3));

    if (accName === "-" || accName === "") return;

    const existingAcc = existingAccounts.find((a) => a.id === accId);
    const isNew = !existingAcc;

    // Read account type: prefer code column (E), fallback to name column (D)
    let accType = getCellVal(row.getCell(5));
    if (!accType || accType === "") {
      const accTypeName = getCellVal(row.getCell(4));
      if (accTypeName === "پیش‌فرض") {
        // Leave empty for default accounts; will use existing value
        accType = "";
      } else {
        accType = typeNameToCode.get(accTypeName) || accTypeName;
      }
    }

    // Read account color: prefer code column (G), fallback to name column (F)
    let accColor = getCellVal(row.getCell(7));
    if (!accColor || accColor === "") {
      const accColorName = getCellVal(row.getCell(6));
      if (accColorName === "پیش‌فرض") {
        // Leave empty for default accounts; will use existing value
        accColor = "";
      } else {
        accColor = colorNameToCode.get(accColorName) || accColorName;
      }
    }

    // Account needs update if name changed
    const needsUpdate = !isNew && existingAcc.name !== accName;

    const accEntry = {
      name: accName,
      // Fallback: existing type for updates, "Bank" for new accounts
      type: accType || existingAcc?.type || "Bank",
      // Fallback: existing color for updates, "Black" for new accounts
      color: accColor || existingAcc?.color || "Black",
      isNew,
      needsUpdate,
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

  // Parse tag rows from sheet 1
  ws1.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber < 2) return;

    const tagName = getCellVal(row.getCell(9));
    const tagId = getCellVal(row.getCell(10));

    if (tagName === "-" || tagName === "") return;

    // Read tag type: prefer code column (L), fallback to name column (K)
    let tagType = getCellVal(row.getCell(12));
    if (!tagType || tagType === "") {
      const tagTypeName = getCellVal(row.getCell(11));
      tagType = tagTypeNameToCode.get(tagTypeName) || tagTypeName;
    }

    const existingTag = existingTags.find((t) => t.id === tagId);
    const isNew = !existingTag;
    const needsUpdate = !isNew && existingTag.name !== tagName;

    const tagEntry = {
      name: tagName,
      type: tagType || existingTag?.type || "other",
      isNew,
      needsUpdate,
      txCount: 0,
      order: Number(getCellVal(row.getCell(8))) || 0,
      id: tagId,
    };

    if (!tagMap.has(tagName)) {
      tagMap.set(tagName, tagEntry);
      tagList.push(tagEntry);
    }
  });

  // Calculate transaction counts and final balances for preview
  rawTransactions.forEach((tx) => {
    if (accMap.has(tx.accountName)) {
      const acc = accMap.get(tx.accountName);
      acc.txCount++;
      switch (tx.type) {
        case "debit":
          acc.finalBalance += tx.value;
          break;
        case "credit":
          acc.finalBalance -= tx.value;
          break;
        case "transfer":
          acc.finalBalance -= tx.value;
          break;
        case "initial":
          acc.finalBalance += tx.value;
          break;
      }
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

  // Ensure the file contains at least some new data
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
