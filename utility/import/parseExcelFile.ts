import ExcelJS from "exceljs";
import { AccountType, AccountTypesType } from "@/utility/accounts/types";
import { TagType, TagItemTypes } from "@/utility/shared/tagTypes";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { faToEn, excelColorOptions, PreviewData } from "./excelConstants";

export async function parseUploadedExcel(
  buffer: ArrayBuffer,
  existingAccounts: AccountType[],
  existingTags: TagType[],
): Promise<PreviewData> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const ws1 = wb.getWorksheet(1);
  const ws3 = wb.getWorksheet(3);

  const getCellVal = (cell: any): string | number => {
    if (!cell) return "";
    let val = cell.value;
    if (typeof val === "object" && val !== null) {
      if (val instanceof Date) return val.toISOString();
      if ("result" in val) val = val.result;
      else if ("richText" in val)
        val = val.richText.map((t: any) => t.text).join("");
      else if ("text" in val) val = val.text;
      else if ("formula" in val) val = "";
    }
    if (val === null || val === undefined) return "";
    if (typeof val === "string") return val.trim();
    if (typeof val === "number") return val;
    return String(val).trim();
  };

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
    String(getCellVal(ws3.getCell("I2"))) !== "کد دسته‌بندی / مقصد" ||
    String(getCellVal(ws3.getCell("L2"))) !== "مبلغ"
  ) {
    throw new Error(
      "اکسل انتخاب‌شده منطبق با نمونه‌ی برنامه نیست، برای ورود داده با اکسل از نمونه‌ی برنامه استفاده کنین",
    );
  }

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
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    if (val === 0) return ""; // جلوگیری از تبدیل 0 به 00:00:00
    if (typeof val === "number" && val > 0 && val < 1) {
      const totalSeconds = Math.round(val * 24 * 3600);
      const h = Math.floor(totalSeconds / 3600);
      const m = Math.floor((totalSeconds % 3600) / 60);
      const s = totalSeconds % 60;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    if (typeof val === "object" && val !== null) {
      if ("result" in val) val = val.result;
      else if ("text" in val) val = val.text;
      else if ("richText" in val)
        val = val.richText.map((t: any) => t.text).join("");
    }
    if (val === 0) return "";
    return String(val || "").trim();
  };

  const getVal = (row: any, cellIdx: number) => {
    let val = getCellVal(row.getCell(cellIdx));
    if (val === "" || val === null || val === undefined) return undefined;
    const parsed = Number(val);
    if (!isNaN(parsed) && val !== "") return parsed;
    return val;
  };

  const uploadedAccounts: any[] = [];
  const uploadedTags: any[] = [];
  const rawTransactions: any[] = [];

  if (ws1) {
    let accOrderFallback = 1000;
    let tagOrderFallback = 1000;

    ws1.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const orderAccStr = getCellVal(row.getCell(1));
      const nameAcc = getCellVal(row.getCell(2));
      const typeAcc = getCellVal(row.getCell(4));
      const colorAcc = getCellVal(row.getCell(6));

      const orderTagStr = getCellVal(row.getCell(8));
      const nameTag = getCellVal(row.getCell(9));
      const typeTag = getCellVal(row.getCell(11));

      if (nameAcc) {
        const existingAcc = existingAccounts.find(
          (a) => a.name === String(nameAcc),
        );
        const orderAccNum = Number(orderAccStr);
        const finalOrderAcc =
          isNaN(orderAccNum) || orderAccStr === ""
            ? accOrderFallback++
            : orderAccNum;

        if (existingAcc && existingAcc.default) {
          uploadedAccounts.push({
            name: String(nameAcc),
            type: existingAcc.type,
            color: existingAcc.color,
            order: existingAcc.name === "وجوه در راه" ? existingAcc.order : finalOrderAcc,
          });
        } else {
          const typeKey =
            Object.keys(AccountTypes).find(
              (k) => AccountTypes[k as AccountTypesType].name === typeAcc,
            ) || "Bank";
          const colorKey =
            excelColorOptions.find((c) => c.label === colorAcc)?.key || "black";
          uploadedAccounts.push({
            name: String(nameAcc),
            type: typeKey,
            color: colorKey,
            order: finalOrderAcc,
          });
        }
      }
      if (nameTag) {
        const orderTagNum = Number(orderTagStr);
        const finalOrderTag =
          isNaN(orderTagNum) || orderTagStr === ""
            ? tagOrderFallback++
            : orderTagNum;
        const tagTypeKey =
          TagItemTypes.find((t) => t.label === typeTag)?.value || "Other";
        uploadedTags.push({
          name: String(nameTag),
          type: tagTypeKey,
          order: finalOrderTag,
        });
      }
    });
  }

  if (ws3) {
    ws3.eachRow((row, rowNumber) => {
      if (rowNumber <= 2) return;

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

      let catOrDestCode: any = getVal(row, 9);
      if (catOrDestCode === "") catOrDestCode = undefined;

      const note = getCellVal(row.getCell(11));
      const rawValue = getCellVal(row.getCell(12));

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
        note: note ? String(note) : "",
        value,
      });
    });
  }

  const accList: any[] = [];
  const accMap = new Map<string, any>();

  existingAccounts.forEach((a) => {
    const obj = {
      id: a.id,
      name: a.name,
      type: a.type,
      color: a.color,
      order: a.name === "وجوه در راه" ? 999 : a.order,
      default: a.default,
      isNew: false,
      needsUpdate: false,
      txCount: 0,
      finalBalance: 0,
    };
    accList.push(obj);
    accMap.set(String(a.id), obj);
    accMap.set(a.name, obj);
  });

  uploadedAccounts.forEach((a) => {
    if (accMap.has(a.name)) {
      const existing = accMap.get(a.name);
      if (!existing.default) {
        if (existing.type !== a.type || existing.color !== a.color) {
          existing.needsUpdate = true;
          existing.type = a.type;
          existing.color = a.color;
        }
      }
      if (existing.name !== "وجوه در راه") existing.order = a.order;
    } else {
      const obj = {
        ...a,
        default: false,
        isNew: true,
        needsUpdate: false,
        txCount: 0,
        finalBalance: 0,
      };
      accList.push(obj);
      accMap.set(a.name, obj);
    }
  });

  const tagList: any[] = [];
  const tagMap = new Map<string, any>();

  existingTags.forEach((t) => {
    const obj = {
      id: t.id,
      name: t.name,
      type: t.type,
      order: t.order,
      isNew: false,
      needsUpdate: false,
      txCount: 0,
    };
    tagList.push(obj);
    tagMap.set(String(t.id), obj);
    tagMap.set(t.name, obj);
  });

  uploadedTags.forEach((t) => {
    if (tagMap.has(t.name)) {
      const existing = tagMap.get(t.name);
      if (existing.type !== t.type) {
        existing.needsUpdate = true;
        existing.type = t.type;
      }
      existing.order = t.order;
    } else {
      const obj = { ...t, isNew: true, needsUpdate: false, txCount: 0 };
      tagList.push(obj);
      tagMap.set(t.name, obj);
    }
  });

  rawTransactions.forEach((tx) => {
    const accKey = String(tx.accountName);
    if (accMap.has(accKey)) {
      const acc = accMap.get(accKey);
      acc.txCount++;
      if (tx.type === "credit" || tx.type === "transfer")
        acc.finalBalance -= tx.value;
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
    accounts: accList.filter((a) => a.txCount > 0 || a.isNew || a.needsUpdate),
    tags: tagList.filter((t) => t.txCount > 0 || t.isNew || t.needsUpdate),
    rawTransactions,
  };
}
