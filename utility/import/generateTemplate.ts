import ExcelJS from "exceljs";
import { AccountType } from "@/utility/accounts/types";
import { TagType, TagItemTypes } from "@/utility/shared/tagTypes";
import { TransactionCategories } from "@/utility/shared/transactionCategories";
import { AccountColors } from "@/utility/shared/colors";
import { AccountTypes } from "@/utility/shared/accountsTypes";

/** Center alignment configuration for Excel cells. */
const centerAlign = { horizontal: "center", vertical: "middle" } as const;

/** Right-to-left alignment configuration for Persian text in Excel cells. */
const rightAlign = {
  horizontal: "right",
  vertical: "middle",
  readingOrder: "rtl",
} as const;

/**
 * Generates the Excel import template workbook and triggers a download.
 *
 * The workbook contains two visible sheets:
 * - "حساب‌ها و برچسب‌ها" (Accounts & Tags): Pre-filled with existing accounts and tags,
 *   with hidden columns for internal codes resolved via VLOOKUP formulas.
 * - "تراکنش‌ها" (Transactions): Pre-formatted with 3000 rows of data validation,
 *   conditional formulas for validation checks, and dropdown lists.
 *
 * A very hidden sheet "Hidden_Maps" stores lookup tables for translating
 * Persian display names to internal code values.
 *
 * @param accounts - The user's existing accounts to pre-fill in the template.
 * @param tags - The user's existing tags to pre-fill in the template.
 * @returns A promise that resolves when the file download is triggered.
 */
export async function generateExcelTemplate(
  accounts: AccountType[],
  tags: TagType[],
) {
  const wb = new ExcelJS.Workbook();

  // Very hidden sheet for mapping Persian display names to internal codes
  const hiddenSheet = wb.addWorksheet("Hidden_Maps");
  hiddenSheet.state = "veryHidden";

  // Account type mapping: Persian name -> internal code
  hiddenSheet.getCell("A1").value = "نام نوع";
  hiddenSheet.getCell("B1").value = "کد نوع";
  let mapRow = 2;
  hiddenSheet.getCell(`A${mapRow}`).value = "پیش‌فرض";
  hiddenSheet.getCell(`B${mapRow}`).value = "Default";
  mapRow++;
  Object.entries(AccountTypes).forEach(([key, type]: [string, any]) => {
    hiddenSheet.getCell(`A${mapRow}`).value = type.name;
    hiddenSheet.getCell(`B${mapRow}`).value = key;
    mapRow++;
  });

  // Account color mapping: Persian name -> internal code
  hiddenSheet.getCell("D1").value = "نام رنگ";
  hiddenSheet.getCell("E1").value = "کد رنگ";
  mapRow = 2;
  Object.entries(AccountColors).forEach(([key, color]: [string, any]) => {
    hiddenSheet.getCell(`D${mapRow}`).value = color.name;
    hiddenSheet.getCell(`E${mapRow}`).value = key;
    mapRow++;
  });

  // Tag type mapping: Persian label -> internal code
  hiddenSheet.getCell("G1").value = "نام نوع برچسب";
  hiddenSheet.getCell("H1").value = "کد نوع برچسب";
  mapRow = 2;
  TagItemTypes.forEach((t: any) => {
    hiddenSheet.getCell(`G${mapRow}`).value = t.label;
    hiddenSheet.getCell(`H${mapRow}`).value = t.value;
    mapRow++;
  });

  // Calculate total category counts for named range references
  let expenseCatCount = 0;
  TransactionCategories.expense.forEach((group) => {
    expenseCatCount += group.sub.length;
  });
  let incomeCatCount = 0;
  TransactionCategories.income.forEach((group) => {
    incomeCatCount += group.sub.length;
  });
  const expenseCatRow = expenseCatCount + 2;
  const incomeCatRow = incomeCatCount + 2;

  // Sheet 1: Accounts and Tags
  const ws1 = wb.addWorksheet("حساب‌ها و برچسب‌ها", {
    views: [{ rightToLeft: true }],
  });

  ws1.columns = [
    { width: 10 }, // A: Order
    { width: 25 }, // B: Account name
    { width: 15 }, // C: Account ID (hidden)
    { width: 15 }, // D: Account type
    { width: 15 }, // E: Type code (hidden)
    { width: 15 }, // F: Account color
    { width: 15 }, // G: Color code (hidden)
    { width: 10 }, // H: Order
    { width: 25 }, // I: Tag name
    { width: 15 }, // J: Tag ID (hidden)
    { width: 15 }, // K: Tag type
    { width: 15 }, // L: Tag type code (hidden)
    { width: 2 }, // M: Separator
  ];

  // Hide internal code columns
  ws1.getColumn(3).hidden = true; // C: Account ID
  ws1.getColumn(5).hidden = true; // E: Type code
  ws1.getColumn(7).hidden = true; // G: Color code
  ws1.getColumn(10).hidden = true; // J: Tag ID
  ws1.getColumn(12).hidden = true; // L: Tag type code
  ws1.getColumn(16).hidden = true; // P: Expense categories (hidden)
  ws1.getColumn(17).hidden = true; // Q: Income categories (hidden)

  /** Instructions displayed in column N of the accounts sheet. */
  const guideLinesSheet1 = [
    "راهنما:",
    "۱) در ستون 'ردیف'، ترتیب نمایش حساب‌ها و برچسب‌ها را وارد کنید.",
    "۲) حساب‌ها و برچسب‌های جدید را فقط با نام وارد کنید.",
    "۳) کدها به صورت خودکار توسط برنامه اختصاص می‌یابند.",
    "۴) برای حساب‌ها، نوع و رنگ را از لیست کشویی انتخاب کنید.",
    "۵) نوع حساب‌های پیش‌فرض سیستم قابل تغییر نیست.",
    "۶) برای دسته‌بندی‌های ثابت از لیست کشویی استفاده کنید.",
  ];

  // Sheet 1 header row
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

  for (let c = 1; c <= 12; c++) {
    ws1.getCell(1, c).alignment = centerAlign;
    ws1.getCell(1, c).font = { bold: true };
  }

  const visibleAccounts = accounts.filter((acc) => !acc.hidden);
  const hiddenAccounts = accounts.filter((acc) => acc.hidden);
  const totalAccounts = visibleAccounts.length + hiddenAccounts.length;

  const maxRows = Math.max(totalAccounts, tags.length);

  /** Comma-separated color names for data validation dropdown. */
  const colorNames = Object.values(AccountColors)
    .map((c: any) => c.name)
    .join(",");

  /** Comma-separated account type names for data validation dropdown. */
  const typeNamesNormal = Object.values(AccountTypes)
    .map((t: any) => t.name)
    .join(",");

  /** Comma-separated tag type labels for data validation dropdown. */
  const tagTypeNames = TagItemTypes.map((t) => t.label).join(",");

  for (let i = 0; i < maxRows; i++) {
    const r = i + 2;

    // Visible accounts
    if (i < visibleAccounts.length) {
      const acc = visibleAccounts[i];

      ws1.getCell(`A${r}`).value = acc.order ?? i + 1;
      ws1.getCell(`A${r}`).numFmt = "[$-,300]#";
      ws1.getCell(`A${r}`).alignment = centerAlign;

      ws1.getCell(`B${r}`).value = acc.name;
      ws1.getCell(`C${r}`).value = acc.id;

      if (acc.default) {
        // Default accounts have locked type with gray background
        ws1.getCell(`D${r}`).value = "پیش‌فرض";
        ws1.getCell(`D${r}`).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F0F0" },
        };
        ws1.getCell(`D${r}`).dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ['"پیش‌فرض"'],
          showErrorMessage: true,
          errorTitle: "نامعتبر",
          error: "نوع حساب پیش‌فرض قابل تغییر نیست",
        };
      } else {
        // Regular accounts have selectable type dropdown
        const accTypeName =
          (AccountTypes as any)[acc.type]?.name || "حساب بانکی";
        ws1.getCell(`D${r}`).value = accTypeName;
        ws1.getCell(`D${r}`).dataValidation = {
          type: "list",
          allowBlank: true,
          formulae: [`"${typeNamesNormal}"`],
          showErrorMessage: true,
          errorTitle: "نامعتبر",
          error: "مقدار مجاز را انتخاب کنید",
        };
      }

      const colorName =
        AccountColors[acc.color as keyof typeof AccountColors]?.name || "مشکی";
      ws1.getCell(`F${r}`).value = colorName;
      ws1.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${colorNames}"`],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "مقدار مجاز را انتخاب کنید",
      };

      // Resolve internal codes via VLOOKUP formulas
      ws1.getCell(`E${r}`).value = {
        formula: `IFERROR(VLOOKUP(D${r},Hidden_Maps!A:B,2,FALSE),"")`,
      };
      ws1.getCell(`G${r}`).value = {
        formula: `IFERROR(VLOOKUP(F${r},Hidden_Maps!D:E,2,FALSE),"")`,
      };
    } else if (i < totalAccounts) {
      // Hidden accounts (funds in transit)
      const hiddenAcc = hiddenAccounts[i - visibleAccounts.length];

      // Order column shows "-" to indicate fixed position
      ws1.getCell(`A${r}`).value = "-";
      ws1.getCell(`A${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };

      ws1.getCell(`B${r}`).value = hiddenAcc.name;
      ws1.getCell(`C${r}`).value = hiddenAcc.id;

      // Type is locked to "Default" for hidden accounts
      ws1.getCell(`D${r}`).value = "پیش‌فرض";
      ws1.getCell(`D${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`D${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"پیش‌فرض"'],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "نوع حساب پیش‌فرض قابل تغییر نیست",
      };

      // Color is locked to "Default" for hidden accounts
      ws1.getCell(`F${r}`).value = "پیش‌فرض";
      ws1.getCell(`F${r}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0F0F0" },
      };
      ws1.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"پیش‌فرض"'],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "رنگ حساب پیش‌فرض قابل تغییر نیست",
      };

      // Write codes directly instead of VLOOKUP for hidden accounts
      ws1.getCell(`E${r}`).value = "Default";
      ws1.getCell(`G${r}`).value = hiddenAcc.color || "Black";
    }

    // Tags
    if (i < tags.length) {
      const tag = tags[i];

      ws1.getCell(`H${r}`).value = tag.order ?? i + 1;
      ws1.getCell(`H${r}`).numFmt = "[$-,300]#";
      ws1.getCell(`H${r}`).alignment = centerAlign;

      ws1.getCell(`I${r}`).value = tag.name;
      ws1.getCell(`J${r}`).value = tag.id;

      const tagTypeName =
        TagItemTypes.find((t) => t.value === tag.type)?.label || "سایر";
      ws1.getCell(`K${r}`).value = tagTypeName;
      ws1.getCell(`K${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`"${tagTypeNames}"`],
        showErrorMessage: true,
        errorTitle: "نامعتبر",
        error: "مقدار مجاز را انتخاب کنید",
      };

      // Resolve tag type code via VLOOKUP
      ws1.getCell(`L${r}`).value = {
        formula: `IFERROR(VLOOKUP(K${r},Hidden_Maps!G:H,2,FALSE),"")`,
      };
    }
  }

  // Write guide lines in column N
  guideLinesSheet1.forEach((line, idx) => {
    ws1.getCell(`N${idx + 1}`).value = line;
    ws1.getCell(`N${idx + 1}`).alignment = rightAlign;
  });

  // Write expense categories in hidden column P
  let expenseIdx = 2;
  TransactionCategories.expense.forEach((group) => {
    group.sub.forEach((cat: any) => {
      ws1.getCell(`P${expenseIdx}`).value = `${group.name} - ${cat.name}`;
      expenseIdx++;
    });
  });

  // Write income categories in hidden column Q
  let incomeIdx = 2;
  TransactionCategories.income.forEach((group) => {
    group.sub.forEach((cat: any) => {
      ws1.getCell(`Q${incomeIdx}`).value = `${group.name} - ${cat.name}`;
      incomeIdx++;
    });
  });

  // Sheet 2: Transactions
  const ws3 = wb.addWorksheet("تراکنش‌ها", { views: [{ rightToLeft: true }] });
  ws3.columns = [
    { width: 12 }, // A: Date
    { width: 8 }, // B: Time
    { width: 12 }, // C: Account ID (hidden)
    { width: 25 }, // D: Account name
    { width: 12 }, // E: Tag ID (hidden)
    { width: 25 }, // F: Tag name
    { width: 12 }, // G: Type code (hidden)
    { width: 12 }, // H: Transaction type
    { width: 25 }, // I: Category / Destination
    { width: 8 }, // J: Validation
    { width: 30 }, // K: Transaction name
    { width: 35 }, // L: Note
    { width: 25 }, // M: Amount
    { width: 20 }, // N: Helper (hidden)
  ];

  /** Instructions displayed in column O of the transactions sheet. */
  const guideLinesSheet3 = [
    "راهنما:",
    "۱) نام حساب و نام برچسب را از لیست کشویی انتخاب کنید.",
    "۲) نوع تراکنش را انتخاب کنید.",
    "۳) برای دریافت/پرداخت: نام دسته‌بندی را به فرمت «سرفصل - دسته‌بندی» وارد کنید.",
    "۴) برای انتقال: نام حساب مقصد را وارد کنید.",
    "۵) تاریخ را با فرمت ۱۴۰۴/۰۱/۰۱ و ساعت را با فرمت ۱۲:۰۰ وارد کنید.",
    "۶) در ستون مبلغ فقط رقم تراکنش را وارد کنید.",
    "۷) تراکنش‌های افتتاح و انتقال نمی‌توانند برچسب داشته باشند.",
  ];

  ws3.getRow(1).height = 30;
  ws3.mergeCells("A1:M1");
  ws3.getCell("A1").value = "تراکنش‌ها";
  ws3.getCell("A1").alignment = centerAlign;
  ws3.getCell("A1").font = { bold: true, size: 14 };

  // Sheet 2 header row
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

  for (let c = 1; c <= 13; c++) {
    ws3.getCell(2, c).alignment = centerAlign;
    ws3.getCell(2, c).font = { bold: true };
  }

  // Hide internal code columns
  ws3.getColumn(3).hidden = true; // C: Account ID
  ws3.getColumn(5).hidden = true; // E: Tag ID
  ws3.getColumn(7).hidden = true; // G: Type code
  ws3.getColumn(14).hidden = true; // N: Helper column

  // Define named ranges pointing to Sheet 1 columns
  const accountNamesRange = `'حساب‌ها و برچسب‌ها'!$B$2:$B$${totalAccounts + 1}`;
  const tagNamesRange = `'حساب‌ها و برچسب‌ها'!$I$2:$I$${tags.length + 1}`;
  const expenseCatNamesRange = `'حساب‌ها و برچسب‌ها'!$P$2:$P$${expenseCatRow}`;
  const incomeCatNamesRange = `'حساب‌ها و برچسب‌ها'!$Q$2:$Q$${incomeCatRow}`;

  wb.definedNames.add(accountNamesRange, "accountNames");
  wb.definedNames.add(tagNamesRange, "tagNames");
  wb.definedNames.add(expenseCatNamesRange, "expenseCatNames");
  wb.definedNames.add(incomeCatNamesRange, "incomeCatNames");
  wb.definedNames.add("'حساب‌ها و برچسب‌ها'!$XFD$1:$XFD$1", "emptyRange");

  // Pre-format 3000 rows with data validation and formulas
  const PREFORMAT_ROWS = 3000;

  for (let r = 3; r <= PREFORMAT_ROWS; r++) {
    ws3.getCell(`A${r}`).numFmt = "@";
    ws3.getCell(`B${r}`).numFmt = "[$-,300]hh:mm;@";
    ws3.getCell(`M${r}`).numFmt = "#,##0";

    // Account name dropdown
    ws3.getCell(`D${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ["accountNames"],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "از لیست انتخاب کنید",
    };

    // Tag name dropdown: empty for transfer/initial, tag list otherwise
    ws3.getCell(`F${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [
        `INDIRECT(IF(OR($H${r}="انتقال",$H${r}="افتتاح"),"emptyRange","tagNames"))`,
      ],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "برای این نوع تراکنش برچسب مجاز نیست",
    };

    // Transaction type dropdown
    ws3.getCell(`H${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"دریافت,پرداخت,انتقال,افتتاح"'],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "مقدار مجاز را انتخاب کنید",
    };

    // Category/destination dropdown: varies by transaction type
    ws3.getCell(`I${r}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [
        `INDIRECT(IF($H${r}="انتقال","accountNames",IF($H${r}="دریافت","incomeCatNames",IF($H${r}="پرداخت","expenseCatNames","emptyRange"))))`,
      ],
      showErrorMessage: true,
      errorTitle: "نامعتبر",
      error: "مقدار مجاز را انتخاب کنید",
    };

    // Validation formula: shows checkmark, X, or empty
    ws3.getCell(`J${r}`).value = {
      formula: `IF(AND(A${r}="",B${r}="",D${r}="",F${r}="",H${r}="",I${r}="",K${r}="",L${r}="",M${r}=""),"",IF(OR(A${r}="",D${r}="",H${r}="",I${r}="",M${r}=""),"✗",IF(AND(ISNUMBER(SEARCH("/",A${r})),OR(ISNUMBER(B${r}),ISNUMBER(SEARCH(":",B${r}))),COUNTIF(accountNames,D${r})>0,IF(F${r}<>"",COUNTIF(tagNames,F${r})>0,TRUE),IF(H${r}="انتقال",COUNTIF(accountNames,I${r})>0,IF(H${r}="دریافت",COUNTIF(incomeCatNames,I${r})>0,IF(H${r}="پرداخت",COUNTIF(expenseCatNames,I${r})>0,FALSE))),M${r}>0),"✓","✗")))`,
    };

    // Helper formula for INDIRECT resolution
    ws3.getCell(`N${r}`).value = {
      formula: `IF(OR(H${r}="دریافت",H${r}="پرداخت"),"tagNames","")`,
    };
  }

  // Write guide lines in column O
  guideLinesSheet3.forEach((line, idx) => {
    ws3.getCell(`O${idx + 2}`).value = line;
    ws3.getCell(`O${idx + 2}`).alignment = rightAlign;
  });

  // Generate and download the file
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
