import { AccountColors } from "@/utility/shared/colors";
import { AccountTypes } from "@/utility/shared/accountsTypes";
import { TagItemTypes } from "@/utility/shared/tagTypes";

/**
 * Converts Persian digits to English digits.
 *
 * @param s - The input string.
 * @returns The string with Persian digits converted to English.
 */
export const faToEn = (s: string) =>
  s
    ? s.toString().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    : "";

/** Number format string for displaying amounts in Excel cells. */
export const AMOUNT_NUMBER_FORMAT = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';

/**
 * Generates color options for Excel data validation dropdowns.
 * Each option includes the color key, display label, and ARGB hex value.
 */
export const excelColorOptions = Object.keys(AccountColors).map((key) => {
  const color = AccountColors[key as keyof typeof AccountColors];
  return {
    key,
    label: color.name,
    argb: `FF${color.primaryValue.replace("#", "").toUpperCase()}`,
  };
});

/** Array of account type display names for use in Excel dropdowns. */
export const excelTypeOptions = Object.values(AccountTypes).map((t) => t.name);

/** Array of tag type display labels for use in Excel dropdowns. */
export const excelTagTypeOptions = TagItemTypes.map((t) => t.label);

/**
 * Preview data structure returned by parseExcelFile.
 * Contains the parsed accounts, tags, and raw transactions from the uploaded Excel file.
 */
export type PreviewData = {
  /** Parsed account entries with metadata for import preview. */
  accounts: {
    name: string;
    type: string;
    color: string;
    isNew: boolean;
    needsUpdate: boolean;
    txCount: number;
    finalBalance: number;
    order: number;
    id: string;
    default: boolean;
  }[];
  /** Parsed tag entries with metadata for import preview. */
  tags: {
    name: string;
    type: string;
    isNew: boolean;
    needsUpdate: boolean;
    txCount: number;
    order: number;
    id: string;
  }[];
  /** Raw transaction rows extracted from the Excel file. */
  rawTransactions: {
    excelRow: number;
    date: string;
    time: string;
    accountName: string;
    tagName: string;
    catOrDestCode: any;
    type: string;
    txName: string;
    note: string;
    value: number;
  }[];
};
