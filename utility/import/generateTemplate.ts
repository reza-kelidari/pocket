import ExcelJS from "exceljs";
import { AccountType } from "@/utility/accounts/types";
import { TagType, TagItemTypes } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import {
  AMOUNT_NUMBER_FORMAT,
  excelColorOptions,
  excelTypeOptions,
  excelTagTypeOptions,
} from "./excelConstants";

export async function generateExcelTemplate(
  existingAccounts: AccountType[],
  existingTags: TagType[],
) {
  const wb = new ExcelJS.Workbook();

  const centerAlign = {
    horizontal: "center",
    vertical: "middle",
    readingOrder: "rtl",
  } as const;
  const rightAlign = {
    horizontal: "right",
    vertical: "middle",
    readingOrder: "rtl",
  } as const;

  // ---------------------------------------------------------------
  // شیت ۱: حساب‌ها و برچسب‌ها
  // ---------------------------------------------------------------
  const ws1 = wb.addWorksheet("حساب‌ها و برچسب‌ها", {
    views: [{ rightToLeft: true }],
  });

  ws1.columns = [
    { width: 10 },
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 10 },
    { width: 25 },
    { width: 15 },
    { width: 15 },
    { width: 15 },
    { width: 2 },
    { width: 40 },
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

  const maxRows1 = 500;
  for (let i = 0; i < maxRows1; i++) {
    const r = i + 2;
    const acc = existingAccounts[i];
    const tag = existingTags[i];

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
          excelColorOptions.find((c) => c.key === acc.color)?.label || "مشکی";
      }
    }
    if (tag) {
      ws1.getCell(`H${r}`).value = tag.order ?? i + 1;
      ws1.getCell(`I${r}`).value = tag.name;
      ws1.getCell(`J${r}`).value = tag.id;
      ws1.getCell(`K${r}`).value =
        TagItemTypes.find((t) => t.value === tag.type)?.label || "سایر";
    }

    if (guideLinesSheet1[i + 1])
      ws1.getCell(`N${r}`).value = guideLinesSheet1[i + 1];

    for (let c = 1; c <= 14; c++)
      ws1.getCell(r, c).alignment = c === 14 ? rightAlign : centerAlign;
  }

  ws1.getColumn(3).hidden = true;
  ws1.getColumn(5).hidden = true;
  ws1.getColumn(7).hidden = true;
  ws1.getColumn(10).hidden = true;
  ws1.getColumn(12).hidden = true;

  for (let r = 2; r <= maxRows1 + 1; r++) {
    ws1.getCell(`A${r}`).dataValidation = {
      type: "custom",
      allowBlank: true,
      formulae: [`COUNTIF($A$2:$A$501,A${r})<=1`],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "ردیف تکراری مجاز نیست",
    };
    ws1.getCell(`H${r}`).dataValidation = {
      type: "custom",
      allowBlank: true,
      formulae: [`COUNTIF($H$2:$H$501,H${r})<=1`],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "ردیف تکراری مجاز نیست",
    };

    if (ws1.getCell(`D${r}`).value !== "پیش‌فرض") {
      ws1.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${excelTypeOptions.join(",")}"`],
      };
      ws1.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${excelColorOptions.map((c) => c.label).join(",")}"`],
      };
    }

    ws1.getCell(`K${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`"${excelTagTypeOptions.join(",")}"`],
    };
  }

  excelColorOptions.forEach((opt) => {
    ws1.addConditionalFormatting({
      ref: `B2:B${maxRows1 + 1}`,
      rules: [
        {
          type: "expression",
          formulae: [`EXACT($F2,"${opt.label}")`],
          priority: 1,
          style: {
            fill: {
              type: "pattern",
              pattern: "solid",
              bgColor: { argb: opt.argb },
            },
            font: { color: { argb: "FFFFFFFF" }, bold: true },
          },
        },
      ],
    });
  });

  // ---------------------------------------------------------------
  // شیت ۲: دسته‌بندی‌ها
  // ---------------------------------------------------------------
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
    ws2.getCell(startRow + 1, startCol).alignment = centerAlign;
    ws2.getCell(startRow + 1, startCol + 1).alignment = centerAlign;

    group.sub.forEach((sub: any, sIdx: number) => {
      const r = startRow + 2 + sIdx;
      ws2.getCell(r, startCol).value = sub.id;
      ws2.getCell(r, startCol + 1).value = sub.name;
      ws2.getCell(r, startCol).alignment = centerAlign;
      ws2.getCell(r, startCol + 1).alignment = centerAlign;
    });
    return startRow + 2 + group.sub.length + 1;
  };

  let rowPtrExp = [2, 2];
  TransactionCategories.expense.forEach((group, idx) => {
    rowPtrExp[idx % 2] = placeCat(
      group,
      rowPtrExp[idx % 2],
      idx % 2 === 0 ? 1 : 4,
    );
  });

  let rowPtrInc = [2, 2];
  TransactionCategories.income.forEach((group, idx) => {
    rowPtrInc[idx % 2] = placeCat(
      group,
      rowPtrInc[idx % 2],
      idx % 2 === 0 ? 7 : 10,
    );
  });

  let lRow = 2,
    nRow = 2;
  TransactionCategories.income.forEach((g) =>
    g.sub.forEach((s) => {
      ws2.getCell(`L${lRow}`).value = s.id;
      ws2.getCell(`M${lRow}`).value = s.name;
      lRow++;
    }),
  );
  TransactionCategories.expense.forEach((g) =>
    g.sub.forEach((s) => {
      ws2.getCell(`N${nRow}`).value = s.id;
      ws2.getCell(`O${nRow}`).value = s.name;
      nRow++;
    }),
  );

  ws2.getColumn(12).hidden = true;
  ws2.getColumn(13).hidden = true;
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

  // ---------------------------------------------------------------
  // شیت ۳: تراکنش‌ها
  // ---------------------------------------------------------------
  const ws3 = wb.addWorksheet("تراکنش‌ها", { views: [{ rightToLeft: true }] });

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
  ];

  const guideLinesSheet3 = [
    "راهنما:",
    "۱) نام حساب و نام برچسب را از لیست کشویی انتخاب کنید (کد آن‌ها خودکار وارد می‌شود).",
    "۲) نوع تراکنش را انتخاب کنید.",
    "۳) برای دریافت/پرداخت: کد دسته‌بندی را در ستون 'کد دسته‌بندی' وارد کنید. نام آن خودکار در ستون بعدی نمایش داده می‌شود.",
    "۴) برای انتقال: نام حساب مقصد را در ستون 'کد دسته‌بندی' وارد کنید. در ستون نام، علامت ✓ نشان‌دهنده صحت نام مقصد است.",
    "۵) تاریخ را با فرمت 1405/01/01 و ساعت را با فرمت 12:00 وارد کنید.",
    "۶) در ستون مبلغ فقط رقم تراکنش را وارد کنید. ستون یادداشت اختیاری است.",
  ];

  ws3.getRow(1).height = 30;
  ws3.mergeCells("A1:L1");
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
  ws3.getCell("I2").value = "کد دسته‌بندی / مقصد";
  ws3.getCell("J2").value = "نام دسته‌بندی / تایید";
  ws3.getCell("K2").value = "یادداشت";
  ws3.getCell("L2").value = "مبلغ";
  ws3.getCell("N2").value = "محدوده برچسب";
  ws3.getCell("O2").value = guideLinesSheet3[0];

  for (let c = 1; c <= 15; c++) {
    ws3.getCell(2, c).alignment = c === 15 ? rightAlign : centerAlign;
    ws3.getCell(2, c).font = { bold: true };
  }

  ws3.getColumn(3).hidden = true;
  ws3.getColumn(5).hidden = true;
  ws3.getColumn(7).hidden = true;
  ws3.getColumn(14).hidden = true;

  const PREFORMAT_ROWS = 3000;
  for (let r = 3; r <= PREFORMAT_ROWS; r++) {
    ws3.getCell(`A${r}`).numFmt = "@";
    ws3.getCell(`B${r}`).numFmt = "@";
    ws3.getCell(`L${r}`).numFmt = AMOUNT_NUMBER_FORMAT;

    if (r - 2 < guideLinesSheet3.length)
      ws3.getCell(`O${r}`).value = guideLinesSheet3[r - 2];

    for (let c = 1; c <= 15; c++) {
      ws3.getCell(r, c).alignment = c === 15 ? rightAlign : centerAlign;
    }

    ws3.getCell(`C${r}`).value = {
      formula: `IFERROR(VLOOKUP(D${r},'حساب‌ها و برچسب‌ها'!$B$2:$C$501,2,FALSE),"")`,
    };
    ws3.getCell(`G${r}`).value = {
      formula: `IF(H${r}="دریافت","debit",IF(H${r}="پرداخت","credit",IF(H${r}="انتقال","transfer",IF(H${r}="افتتاح","initial",""))))`,
    };
    ws3.getCell(`E${r}`).value = {
      formula: `IF(G${r}="initial",0,IFERROR(VLOOKUP(F${r},'حساب‌ها و برچسب‌ها'!$I$2:$J$501,2,FALSE),0))`,
    };
    ws3.getCell(`N${r}`).value = {
      formula: `IF(G${r}="initial","'حساب‌ها و برچسب‌ها'!$Z$1","'حساب‌ها و برچسب‌ها'!$I$2:$I$501")`,
    };
    ws3.getCell(`J${r}`).value = {
      formula: `IF(I${r}="","",IF(G${r}="transfer",IF(ISNUMBER(MATCH(I${r},'حساب‌ها و برچسب‌ها'!$B$2:$B$501,0)),"✓","✗"),IF(G${r}="credit",IFERROR(VLOOKUP(I${r},'دسته‌بندی‌ها'!$N$2:$O$501,2,FALSE),"✗"),IFERROR(VLOOKUP(I${r},'دسته‌بندی‌ها'!$L$2:$M$501,2,FALSE),"✗"))))`,
    };

    ws3.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["'حساب‌ها و برچسب‌ها'!$B$2:$B$501"],
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
