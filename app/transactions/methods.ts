import { jalaliToTimestamp } from "@/utility/shared/timeMethods";

export type TransactionsFilterType = {
  timeWindow: number;
  accounts: string[];
  categories: string[];
  tags: string[];
};

export const filterToUrl = (filter: TransactionsFilterType): string => {
  const { timeWindow, accounts, categories, tags } = filter;
  let result = "?";
  result += `time=${timeWindow}&`;
  if (accounts && accounts.length > 0)
    result += `accounts=${accounts.join(",")}&`;
  if (categories && categories.length > 0)
    result += `categories=${categories.join(",")}&`;
  if (tags && tags.length > 0) result += `tags=${tags.join(",")}&`;
  return result;
};

export const parseStringArray = (param: string | null): string[] => {
  if (!param) return [];
  return param.split(",").filter((s) => s !== "");
};

export const timeFilters = (dateArray: number[]) => {
  return [
    { name: "۷ روز گذشته", time: 7 - 1 },
    { name: "۳۰ روز گذشته", time: 30 - 1 },
    { name: "این ماه", time: -1 },
    { name: "۹۰ روز گذشته", time: 90 - 1 },
    { name: "امسال", time: -2 },
    { name: "از ابتدا", time: 36500 },
  ];
};
