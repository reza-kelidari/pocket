import { pastDaysInYear } from "@/utility/time/methods";
import { transactionsFilterType } from "./page";

export const filterToUrl: (
  transactionsFilter: transactionsFilterType,
) => string = (transactionsFilter: transactionsFilterType) => {
  const { timeWindow, accounts, categories, tags } = transactionsFilter;
  let result = "?";

  result += `time=${timeWindow}&`;
  if (accounts) result += `accounts=${accounts.join(",")}&`;
  if (categories) result += `categories=${categories.join(",")}&`;
  if (tags) result += `tags=${tags.join(",")}&`;

  return result;
};

export const parseNumberArray = (param: string | null): number[] => {
  if (!param) return [];
  return param
    .split(",")
    .map(Number)
    .filter((n) => !isNaN(n) && n !== 0);
};

export const timeFilters = (dateArray: number[]) => [
  { name: "۷ روز گذشته", time: 7 - 1 },
  { name: "۳۰ روز گذشته", time: 30 - 1 },
  { name: "این ماه", time: dateArray[2] - 1 },
  { name: "۹۰ روز گذشته", time: 90 - 1 },
  { name: "امسال", time: pastDaysInYear(dateArray) - 1 },
  { name: "از ابتدا", time: 36500 },
];
