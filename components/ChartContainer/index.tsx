"use client";
import { useState, useEffect, useRef } from "react";
import Button from "../Button";
import { BalanceType } from "@/utility/balance/types";
import { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import ChartBox from "./ChartBox";
import Box from "../Box";

const ALL_TIME = 36500;

type ChartParamsType = {
  title: string;
  titlePrimary?: boolean;
  accountID?: string;
  tag?: string;
  /** Time window in days. -1 = this month, -2 = this year, 36500 = all time. */
  time: number;
  /** When provided, shows the 7/30/90/all selector and calls back on change. */
  onTimeChange?: (time: number) => void;
  /** Optional override for the "(...)" suffix shown next to the title. */
  windowLabel?: string;
  link?: string;
  linkTitle?: string;
  color?: AccountColorType;
};

const FILTERS: Array<{ label: string; value: number }> = [
  { label: "۷", value: 7 },
  { label: "۳۰", value: 30 },
  { label: "۹۰", value: 90 },
  { label: "همه", value: ALL_TIME },
];

function defaultWindowLabel(time: number, allTimeSpanDays: number): string {
  if (time === ALL_TIME) {
    return allTimeSpanDays > 0
      ? `(${allTimeSpanDays.toLocaleString("fa-ir")} روز گذشته)`
      : "(از ابتدا)";
  }
  if (time === -1) return "(این ماه)";
  if (time === -2) return "(امسال)";
  return `(${time.toLocaleString("fa-ir")} روز گذشته)`;
}

export default function ChartContainer({
  title,
  titlePrimary,
  accountID,
  tag,
  time,
  onTimeChange,
  windowLabel,
  link,
  linkTitle,
  color,
}: ChartParamsType) {
  /** Whether we've ever successfully received data. Used to decide
   *  between full skeleton and in-place chart loading. */
  const hasLoadedOnceRef = useRef(false);

  /** True only on the very first load (before any data). */
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /** True while a refetch (time change) is in flight, when we already
   *  have data to keep showing. */
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [points, setPoints] = useState<BalanceType[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [allTimeSpanDays, setAllTimeSpanDays] = useState(0);

  useEffect(() => {
    let isMounted = true;

    if (hasLoadedOnceRef.current) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }

    (async () => {
      try {
        const params = new URLSearchParams();
        if (accountID) params.set("accountId", accountID);
        params.set("time", String(time));
        if (tag) params.set("tag", tag);

        const res = await fetch(`/api/chart?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch chart data");
        const data = (await res.json()) as {
          points: BalanceType[];
          currentBalance: number;
          allTimeSpanDays: number;
        };
        if (!isMounted) return;

        setPoints(data.points ?? []);
        setCurrentBalance(data.currentBalance ?? 0);
        setAllTimeSpanDays(data.allTimeSpanDays ?? 0);
        hasLoadedOnceRef.current = true;
      } catch (err) {
        console.error("ChartContainer fetch failed:", err);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [accountID, time, tag]);

  if (isInitialLoading) {
    return (
      <Box className="overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-24 bg-elements-background rounded animate-pulse" />
          {onTimeChange && (
            <div className="h-7 w-24 bg-elements-background rounded-4xl animate-pulse" />
          )}
        </div>
        <div className="h-40 w-full bg-elements-background border border-elements-border rounded-2xl animate-pulse" />
        <div className="h-5 w-28 bg-elements-background rounded mt-4 animate-pulse" />
      </Box>
    );
  }

  const label = windowLabel ?? defaultWindowLabel(time, allTimeSpanDays);
  const showSelector = !!onTimeChange;

  return (
    <Box className="overflow-hidden animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3
          className={`${titlePrimary ? "forground" : "text-secondary"} text-xs`}
        >
          {title} {label}
        </h3>
        {showSelector && (
          <div
            className={`flex gap-2 items-center justify-between h-7 rounded-4xl ${
              color ? AccountColors[color].surface : PrimaryColors.primary.bg
            }`}
          >
            {FILTERS.map((item) => (
              <span
                key={item.label}
                className={`text-xs h-full min-w-7 px-1.5 grid place-items-center rounded-4xl cursor-pointer transition-colors ${
                  item.value === time
                    ? `${color ? AccountColors[color].primary : "bg-primary"} text-white`
                    : "text-secondary hover:bg-black/5"
                }`}
                onClick={() => onTimeChange?.(item.value)}
              >
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative">
        <div
          className={`transition-opacity duration-200 ${
            isRefreshing ? "opacity-40" : "opacity-100"
          }`}
        >
          <ChartBox data={points} color={color} minPointDistance={20} />
        </div>

        {isRefreshing && (
          <div className="absolute inset-0 grid place-items-center pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-elements-border rounded-2xl shadow-sm">
              <div
                className={`w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin ${
                  color ? AccountColors[color].text : "text-primary"
                }`}
              />
              <span className="text-[10px] text-secondary">
                در حال به‌روزرسانی
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1.5 mr-auto items-center mt-4">
        <h1
          className={`font-bold transition-opacity duration-200 ${
            isRefreshing ? "opacity-50" : "opacity-100"
          }`}
        >
          {currentBalance.toLocaleString("fa-ir")}
        </h1>
        <span className="text-xs">﷼</span>
      </div>
      {link && <Button href={link}>{linkTitle || ""}</Button>}
    </Box>
  );
}
