"use client";

import NavbarTitle from "@/components/NavbarTitle";
import { toJalaliDateArray } from "@/utility/shared/timeMethods";
import { useRouter, useSearchParams } from "next/navigation";
import { filterToUrl, timeFilters } from "../methods";
import { PrimaryColors } from "@/utility/colors";

export default function TimeFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const date = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "long",
  };
  const today = date.toLocaleDateString("fa-ir", dateOptions);

  const parseNumberArray = (param: string | null): number[] => {
    if (!param) return [];
    return param
      .split(",")
      .map(Number)
      .filter((n) => !isNaN(n) && n !== 0);
  };

  const transactionsFilter = {
    timeWindow: Number(searchParams.get("time") ?? 29) || 29,
    accounts: parseNumberArray(searchParams.get("accounts")),
    categories: parseNumberArray(searchParams.get("categories")),
    tags: parseNumberArray(searchParams.get("tags")),
  };

  const handleSelectTime = (time: number) => {
    const newUrl = `/transactions${filterToUrl({
      ...transactionsFilter,
      timeWindow: time,
    })}`;
    
    // جایگزینی صفحه فعلی با صفحه تراکنش‌های فیلتر شده
    router.replace(newUrl);
  };

  return (
    <div className="p-7.5 grid gap-15 w-screen overflow-hidden">
      <div className="grid gap-7.5">
        <NavbarTitle title="بازه زمانی" />
      </div>

      <div className="grid gap-5">
        {timeFilters(toJalaliDateArray(date)).map((item, index) => {
          const secondDay =
            item.time === 36500
              ? "بدون محدودیت زمانی"
              : new Date(
                  Date.now() - item.time * 1000 * 3600 * 24,
                ).toLocaleDateString("fa-ir", dateOptions);
          return (
            <div
              key={index}
              onClick={() => handleSelectTime(item.time)}
              className={`${transactionsFilter.timeWindow === item.time ? PrimaryColors.primary.box : PrimaryColors.secondary.box} px-5 py-4 rounded-2xl text-sm flex items-center justify-between cursor-pointer`}
            >
              {item.name}
              <span className="text-xs text-secondary">
                {secondDay} {item.time !== 36500 && "~ " + today}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}