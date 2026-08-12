import ExcelJS from "exceljs";
import { AccountType } from "@/utility/accounts/types";
import { TagType, TagItemTypes } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { AccountColors } from "@/utility/shared/colors";
import { AccountTypes } from "@/utility/shared/accountsTypes";

const centerAlign = { horizontal: "center", vertical: "middle" } as const;
const rightAlign = {
  horizontal: "right",
  vertical: "middle",
  readingOrder: "rtl",
} as const;

/**
 * Generates the Excel import template workbook.
 *
 * @param accounts - The user's existing accounts.
 * @param tags - The user's existing tags.
 * @returns A promise that resolves when the file is downloaded.
 */
export async function generateExcelTemplate(
  accounts: AccountType[],
  tags: TagType[],
) {
  const wb = new ExcelJS.Workbook();

  // ─────────────────────────────────────────────────────────────
  // شیت ۱: حساب‌ها و برچسب‌ها
  // ─────────────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("حساب‌ها و برچسب‌ها", {
    views: [{ rightToLeft: true }],
  });

  ws1.columns = [
    { width: 10 }, // A: ردیف
    { width: 25 }, // B: نام حساب
    { width: 15 }, // C: کد حساب
    { width: 15 }, // D: نوع حساب
    { width: 15 }, // E: کد نوع
    { width: 15 }, // F: رنگ حساب
    { width: 15 }, // G: کد رنگ
    { width: 10 }, // H: ردیف
    { width: 25 }, // I: نام برچسب
    { width: 15 }, // J: کد برچسب
    { width: 15 }, // K: نوع برچسب
    { width: 15 }, // L: کد نوع برچسب
    { width: 2 }, // M: جداکننده
    { width: 40 }, // N: راهنما
  ];

  const guideLinesSheet1 = [
    "راهنما:",
    "۱) در ستون 'ردیف'، ترتیب نمایش حساب‌ها و برچسب‌ها را وارد کنید (دوبار وارد کردن یک عدد مجاز نیست).",
    "۲) حساب‌ها و برچسب‌های جدید را فقط با نام در ستون‌های مربوطه وارد کنید.",
    "۳) کدها به صورت خودکار توسط برنامه اختصاص می‌یابند، نیازی به وارد کردن کد نیست.",
    "۴) برای حساب‌ها، نوع و رنگ را از لیست کشویی انتخاب کنید. اگر خالی بگذارید، پیش‌فرض (بانکی/مشکی) ثبت می‌شود.",
    "۵) نوع و رنگ حساب‌های پیش‌فرض سیستم قابل تغییر نیست.",
    "۶) برای دسته‌بندی‌های ثابت برنامه از شیت دوم استفاده کنید و نیازی به ساخت برچسب نیست.",
  ];

  ws1.getCell("A1").value = "ردیف";
  ws1.getCell("B1").value = "نام حساب";
  ws1.getCell("C1").value = "کد حساب";
  ws1.getCell("D1").value = "نوع حساب";
  ws1.getCell("E1").value = "کد نوع";
  ws1.getCell("F1").value = "رنگ حساب";
  ws1.getCell("G1").value = "کد رنگ";
  ws1.getCell("H1").value = "ردیف";
  ws1.getCell("I1").value = "نام برچسب";
  ws1.getCell("J1").value = "کد برچسب";
  ws1.getCell("K1").value = "نوع برچسب";
  ws1.getCell("L1").value = "کد نوع برچسب";
  ws1.getCell("N1").value = guideLinesSheet1[0];

  for (let c = 1; c <= 14; c++) {
    ws1.getCell(1, c).alignment = c === 14 ? rightAlign : centerAlign;
    ws1.getCell(1, c).font = { bold: true };
  }

  const visibleAccounts = accounts.filter((acc) => !acc.hidden);
  const hiddenAccounts = accounts.filter((acc) => acc.hidden);

  const maxRows = Math.max(
    visibleAccounts.length + hiddenAccounts.length,
    tags.length,
  );

  for (let i = 0; i < maxRows; i++) {
    const r = i + 2;

    const acc = visibleAccounts[i];
    const hiddenAcc =
      i >= visibleAccounts.length
        ? hiddenAccounts[i - visibleAccounts.length]
        : undefined;
    const tag = tags[i];

    if (acc) {
      ws1.getCell(`A${r}`).value = acc.order ?? i + 1;
      ws1.getCell(`B${r}`).value = acc.name;
      ws1.getCell(`C${r}`).value = acc.id;

      if (acc.default) {
        ws1.getCell(`D${r}`).value = "پیش‌فرض";
        ws1.getCell(`F${r}`).value = "پیش‌فرض";
        ws1.getCell(`D${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
        ws1.getCell(`F${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
      } else {
        ws1.getCell(`D${r}`).value =
          (AccountTypes as any)[acc.type]?.name || "حساب بانکی";
        ws1.getCell(`F${r}`).value =
          Object.keys(AccountColors).find((k) => k === acc.color) || "مشکی";
      }

      ws1.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [
          `"${Object.values(AccountTypes)
            .map((t: any) => t.name)
            .join(",")}"`,
        ],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "مقدار مجاز را انتخاب کنید",
      };

      ws1.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${Object.keys(AccountColors).join(",")}"`],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "مقدار مجاز را انتخاب کنید",
      };
    } else if (hiddenAcc) {
      ws1.getCell(`A${r}`).value = "-";
      ws1.getCell(`B${r}`).value = "-";
      ws1.getCell(`C${r}`).value = "-";
      ws1.getCell(`D${r}`).value = "-";
      ws1.getCell(`F${r}`).value = "-";

      ws1.getCell(`A${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`B${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`C${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`D${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`F${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
    }

    if (tag) {
      ws1.getCell(`H${r}`).value = tag.order ?? i + 1;
      ws1.getCell(`I${r}`).value = tag.name;
      ws1.getCell(`J${r}`).value = tag.id;
      ws1.getCell(`K${r}`).value =
        TagItemTypes.find((t) => t.value === tag.type)?.label || "سایر";

      ws1.getCell(`K${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${TagItemTypes.map((t) => t.label).join(",")}"`],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "مقدار مجاز را انتخاب کنید",
      };
    }

    if (guideLinesSheet1[i + 1]) {
      ws1.getCell(`N${r}`).value = guideLinesSheet1[i + 1];
      ws1.getCell(`N${r}`).alignment = rightAlign;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // شیت ۲: دسته‌بندی‌ها
  // ─────────────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("دسته‌بندی‌ها", {
    views: [{ rightToLeft: true }],
  });

  ws2.getRow(1).height = 30;
  ws2.mergeCells("A1:E1");
  ws2.getCell("A1").value = "دسته‌بندی‌های هزینه";
  ws2.mergeCells("G1:K1");
  ws2.getCell("G1").value = "دسته‌بندی‌های درآمد";

  ws2.getRow(1).eachCell((cell) => {
    cell.alignment = centerAlign;
    cell.font = { bold: true };
  });

  const placeCat = (group: any, startRow: number, startCol: number) => {
    ws2.mergeCells(startRow, startCol, startRow, startCol + 1);
    ws2.getCell(startRow, startCol).value = group.name;
    ws2.getCell(startRow, startCol).alignment = centerAlign;
    ws2.getCell(startRow, startCol).font = { bold: true };

    ws2.getCell(startRow + 1, startCol).value = "کد";
    ws2.getCell(startRow + 1, startCol + 1).value = "نام دسته‌بندی";

    group.sub.forEach((cat: any, idx: number) => {
      const row = startRow + 2 + idx;
      ws2.getCell(row, startCol).value = cat.id;
      ws2.getCell(row, startCol + 1).value = cat.name;
    });

    return startRow + 2 + group.sub.length + 1;
  };

  let expenseRow = 3;
  TransactionCategories.expense.forEach((group) => {
    expenseRow = placeCat(group, expenseRow, 1);
  });

  let incomeRow = 3;
  TransactionCategories.income.forEach((group) => {
    incomeRow = placeCat(group, incomeRow, 7);
  });

  ws2.getCell("N1").value = "دسته‌بندی‌های هزینه (سرفصل - دسته‌بندی)";
  ws2.getCell("O1").value = "دسته‌بندی‌های درآمد (سرفصل - دسته‌بندی)";
  ws2.getCell("N1").font = { bold: true };
  ws2.getCell("O1").font = { bold: true };

  let expenseCatRow = 2;
  TransactionCategories.expense.forEach((group) => {
    group.sub.forEach((cat: any) => {
      ws2.getCell(`N${expenseCatRow}`).value = `${group.name} - ${cat.name}`;
      expenseCatRow++;
    });
  });

  let incomeCatRow = 2;
  TransactionCategories.income.forEach((group) => {
    group.sub.forEach((cat: any) => {
      ws2.getCell(`O${incomeCatRow}`).value = `${group.name} - ${cat.name}`;
      incomeCatRow++;
    });
  });

  ws2.getColumn(14).hidden = true;
  ws2.getColumn(15).hidden = true;

  const colWidths = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
  ws2.eachRow({ includeEmpty: true }, (row) => {
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (cell.value && colNumber <= 11) {
        const len = cell.value.toString().length;
        if (len > colWidths[colNumber - 1]) colWidths[colNumber - 1] = len;
      }
    });
  });

  for (let i = 0; i < 11; i++) {
    let width = colWidths[i] + 2;
    if (i < 5) width = Math.round(width * 0.75);
    ws2.getColumn(i + 1).width = width;
  }

  // ─────────────────────────────────────────────────────────────
  // شیت ۳: تراکنش‌ها
  // ─────────────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet("تراکنش‌ها", {
    views: [{ rightToLeft: true }],
  });

  ws3.columns = [
    { width: 12 },
    { width: 8 },
    { width: 12 },
    { width: 25 },
    { width: 12 },
    { width: 25 },
    { width: 12 },
    { width: 15 },
    { width: 15 },
    { width: 25 },
    { width: 30 },
    { width: 15 },
    { width: 2 },
    { width: 20 },
    { width: 20 },
  ];

  const guideLinesSheet3 = [
    "راهنما:",
    "۱) نام حساب و نام برچسب را از لیست کشویی انتخاب کنید (کد آن‌ها خودکار وارد می‌شود).",
    "۲) نوع تراکنش را انتخاب کنید.",
    "۳) برای دریافت/پرداخت: نام دسته‌بندی را به فرمت «سرفصل - دسته‌بندی» وارد کنید (مثلاً: مواد غذایی - برنج و روغن).",
    "۴) برای انتقال: نام حساب مقصد را وارد کنید.",
    "۵) تاریخ را با فرمت ۱۴۰۴/۰۱/۰۱ و ساعت را با فرمت ۱۲:۰۰ وارد کنید.",
    "۶) در ستون مبلغ فقط رقم تراکنش را وارد کنید. ستون نام تراکنش و یادداشت اختیاری هستند.",
  ];

  ws3.getRow(1).height = 30;
  ws3.mergeCells("A1:M1");
  ws3.getCell("A1").value = "تراکنش‌ها";
  ws3.getCell("A1").alignment = centerAlign;
  ws3.getCell("A1").font = { bold: true, size: 14 };

  ws3.getCell("A2").value = "تاریخ";
  ws3.getCell("B2").value = "ساعت";
  ws3.getCell("C2").value = "کد حساب";
  ws3.getCell("D2").value = "نام حساب";
  ws3.getCell("E2").value = "کد برچسب";
  ws3.getCell("F2").value = "نام برچسب";
  ws3.getCell("G2").value = "کد نوع";
  ws3.getCell("H2").value = "نوع تراکنش";
  ws3.getCell("I2").value = "دسته‌بندی / مقصد";
  ws3.getCell("J2").value = "تایید";
  ws3.getCell("K2").value = "نام تراکنش";
  ws3.getCell("L2").value = "یادداشت";
  ws3.getCell("M2").value = "مبلغ";
  ws3.getCell("O2").value = guideLinesSheet3[0];

  for (let c = 1; c <= 15; c++) {
    ws3.getCell(2, c).alignment = c === 15 ? rightAlign : centerAlign;
    ws3.getCell(2, c).font = { bold: true };
  }

  ws3.getColumn(3).hidden = true;
  ws3.getColumn(5).hidden = true;
  ws3.getColumn(7).hidden = true;
  ws3.getColumn(14).hidden = true;

  const accountNamesRange = `'حساب‌ها و برچسب‌ها'!$B$2:$B$${visibleAccounts.length + 1}`;
  const tagNamesRange = `'حساب‌ها و برچسب‌ها'!$I$2:$I$${tags.length + 1}`;
  const expenseCatNamesRange = `'دسته‌بندی‌ها'!$N$2:$N$${expenseCatRow}`;
  const incomeCatNamesRange = `'دسته‌بندی‌ها'!$O$2:$O$${incomeCatRow}`;

  const PREFORMAT_ROWS = 3000;

  for (let r = 3; r <= PREFORMAT_ROWS; r++) {
    ws3.getCell(`A${r}`).numFmt = "@";
    ws3.getCell(`B${r}`).numFmt = "@";
    ws3.getCell(`M${r}`).numFmt = "#,##0";

    ws3.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [accountNamesRange],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "از لیست انتخاب کنید",
    };

    ws3.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`INDIRECT(N${r})`],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "برای این نوع تراکنش برچسب مجاز نیست",
    };

    ws3.getCell(`H${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"دریافت,پرداخت,انتقال,افتتاح"'],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "مقدار مجاز را انتخاب کنید",
    };

    ws3.getCell(`I${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [
        `INDIRECT(IF($G${r}="انتقال", "accountNames", IF($G${r}="دریافت", "incomeCatNames", "expenseCatNames")))`,
      ],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "مقدار مجاز را انتخاب کنید",
    };

    ws3.getCell(`J${r}`).value = {
      formula: `IF(OR(A${r}="", D${r}="", H${r}="", I${r}="", M${r}=""), "✗",
        IF(AND(
          ISNUMBER(SEARCH("/", A${r})),
          ISNUMBER(SEARCH(":", B${r})),
          COUNTIF(accountNames, D${r})>0,
          IF(F${r}<>"", COUNTIF(tagNames, F${r})>0, TRUE),
          IF(H${r}="انتقال", COUNTIF(accountNames, I${r})>0,
            IF(H${r}="دریافت", COUNTIF(incomeCatNames, I${r})>0,
              IF(H${r}="پرداخت", COUNTIF(expenseCatNames, I${r})>0, FALSE)
            )
          ),
          M${r}>0
        ), "✓", "✗"))`,
    };

    ws3.getCell(`N${r}`).value = {
      formula: `IF(OR(G${r}="دریافت", G${r}="پرداخت"), tagNames, "")`,
    };

    if (guideLinesSheet3[1]) {
      ws3.getCell(`O${r}`).value = guideLinesSheet3[1];
      ws3.getCell(`O${r}`).alignment = rightAlign;
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "نمونه-ایمپورت-تراکنش‌ها.xlsx";
  a.click();
  URL.revokeObjectURL(url);
}
