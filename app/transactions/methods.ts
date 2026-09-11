export type TransactionsFilterType = {
  timeWindow: number;
  accounts: string[];
  categories: string[];
  tags: string[];
};

export const DEFAULT_TIME_WINDOW = 29;

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

export const TIME_FILTERS = {
  SEVEN_DAYS: 7,
  THIRTY_DAYS: 30,
  THIS_MONTH: -1,
  NINETY_DAYS: 90,
  THIS_YEAR: -2,
  ALL_TIME: 36500,
} as const;

export const timeFilters = (dateArray: number[]) => {
  return [
    { name: "۷ روز گذشته", time: TIME_FILTERS.SEVEN_DAYS - 1 },
    { name: "۳۰ روز گذشته", time: TIME_FILTERS.THIRTY_DAYS - 1 },
    { name: "این ماه", time: TIME_FILTERS.THIS_MONTH },
    { name: "۹۰ روز گذشته", time: TIME_FILTERS.NINETY_DAYS - 1 },
    { name: "امسال", time: TIME_FILTERS.THIS_YEAR },
    { name: "از ابتدا", time: TIME_FILTERS.ALL_TIME },
  ];
};
