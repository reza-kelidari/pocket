import { AccountTypes } from "@/utility/shared/accountsTypes";
import { AccountColors } from "@/utility/shared/colors";
import { TagItemTypes } from "@/utility/shared/tagTypes";

export const faToEn = (s: string) =>
  s
    ? s.toString().replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    : "";

export const AMOUNT_NUMBER_FORMAT = '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)';

export const excelColorOptions = Object.keys(AccountColors).map((key) => {
  const color = AccountColors[key as keyof typeof AccountColors];
  return {
    key,
    label: color.name,
    argb: `FF${color.primaryValue.replace("#", "").toUpperCase()}`,
  };
});

export const excelTypeOptions = Object.values(AccountTypes).map((t) => t.name);
export const excelTagTypeOptions = TagItemTypes.map((t) => t.label);

export type PreviewData = {
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
  tags: {
    name: string;
    type: string;
    isNew: boolean;
    needsUpdate: boolean;
    txCount: number;
    order: number;
    id: string;
  }[];
  rawTransactions: any[];
};
