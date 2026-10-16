/**
 * @fileoverview Balance Chart Container
 *
 * A self-contained chart widget that:
 * - Fetches balance data from `/api/chart` for a given time window.
 * - Renders an inline SVG line/area chart via {@link ChartBox}.
 * - Optionally shows an inline 7 / 30 / 90 / all-time selector.
 * - Optionally shows a secondary "cash on hand" figure below the total
 *   balance, excluding `Book` accounts (receivables / payables), with a
 *   help icon placed to the right of the label that reveals an
 *   explanatory tooltip on click.
 *
 * The component distinguishes between two loading states:
 * - **Initial load** — nothing has been rendered yet; a skeleton is shown.
 * - **Refresh** — data is being refetched (e.g. after changing the time
 *   window); the existing chart stays visible, dimmed, with a small spinner.
 *
 * @module components/ChartContainer
 */

"use client";
import { useState, useEffect, useRef } from "react";
import Button from "../Button";
import { BalanceType } from "@/utility/balance/types";
import { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import ChartBox from "./ChartBox";
import Box from "../Box";
import Info from "@/icons/Info";

/** Sentinel value meaning "no time restriction" (≈ 100 years). */
const ALL_TIME = 36500;

/** Explanatory text shown in the help tooltip next to the cash figure. */
const CASH_TOOLTIP_TEXT =
  "موجودی بعد از کسر بدهی‌ها و طلب‌ها";

/**
 * Props accepted by {@link ChartContainer}.
 */
type ChartParamsType = {
  /** Chart title, e.g. "موجودی کل" or "موجودی بانک ملی". */
  title: string;
  /** When true, the title uses the default foreground color instead of secondary. */
  titlePrimary?: boolean;
  /** When provided, restricts the chart to this account only. */
  accountID?: string;
  /** When provided, restricts the chart to transactions carrying this tag. */
  tag?: string;
  /**
   * Time window in days.
   * - `-1` = this Jalali month
   * - `-2` = this Jalali year
   * - `36500` = all time
   * - any positive number = last N days
   */
  time: number;
  /**
   * When provided, renders the 7 / 30 / 90 / all-time selector and calls
   * this callback with the newly selected window.
   */
  onTimeChange?: (time: number) => void;
  /** Optional override for the "(...)" suffix next to the title. */
  windowLabel?: string;
  /** When provided, renders a footer button linking to this URL. */
  link?: string;
  /** Label text for the footer button. */
  linkTitle?: string;
  /** Optional account color used to theme the chart and selector. */
  color?: AccountColorType;
  /**
   * When `true`, renders "در دسترس" (available cash) below the total
   * balance, together with a help icon placed to the right of the label
   * whose tooltip explains what the figure represents. The value comes
   * from the API's `cashOnHand` field, which excludes `Book` accounts.
   * Useful on the home page; should stay off on account-detail pages
   * where the concept doesn't apply.
   */
  showCashOnHand?: boolean;
};

/** Preset buttons shown inside the inline time selector. */
const FILTERS: Array<{ label: string; value: number }> = [
  { label: "۷", value: 7 },
  { label: "۳۰", value: 30 },
  { label: "۹۰", value: 90 },
  { label: "همه", value: ALL_TIME },
];

/**
 * Builds the default "(...)" window label shown next to the chart title.
 *
 * @param time - The current time window.
 * @param allTimeSpanDays - Days since the first transaction (used for "all time").
 * @returns A Persian, parenthesized label describing the window.
 */
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

/**
 * Renders a balance chart with an optional time-window selector and an
 * optional "cash on hand" line (with an explanatory help tooltip).
 *
 * @param props - See {@link ChartParamsType}.
 * @returns The chart container UI.
 *
 * @example
 * ```tsx
 * <ChartContainer
 *   title="روند موجودی"
 *   time={chartTime}
 *   onTimeChange={setChartTime}
 *   showCashOnHand
 * />
 * ```
 */
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
  showCashOnHand = false,
}: ChartParamsType) {
  /**
   * Whether data has ever been received successfully. Distinguishes the
   * first load (skeleton) from a subsequent refetch (dimmed chart).
   */
  const hasLoadedOnceRef = useRef(false);

  /** `true` only on the very first load, before any data is available. */
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  /** `true` while a refetch is in flight and old data is still visible. */
  const [isRefreshing, setIsRefreshing] = useState(false);

  /** Balance points returned by the API, one per Tehran day in the window. */
  const [points, setPoints] = useState<BalanceType[]>([]);

  /** Balance at the most recent point. */
  const [currentBalance, setCurrentBalance] = useState(0);

  /** Days since the earliest transaction, used by the "all time" label. */
  const [allTimeSpanDays, setAllTimeSpanDays] = useState(0);

  /**
   * Available cash (excluding `Book` accounts) as returned by the API.
   * `null` when the API omits it (e.g. account-scoped requests).
   */
  const [cashOnHand, setCashOnHand] = useState<number | null>(null);

  /** `true` while the help tooltip next to the cash figure is visible. */
  const [isCashTooltipOpen, setIsCashTooltipOpen] = useState(false);

  /** Ref wrapping the help icon + tooltip so we can detect outside clicks. */
  const cashHelpRef = useRef<HTMLDivElement>(null);

  // ─── Fetch data whenever the input parameters change ─────────
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
          cashOnHand?: number | null;
        };
        if (!isMounted) return;

        setPoints(data.points ?? []);
        setCurrentBalance(data.currentBalance ?? 0);
        setAllTimeSpanDays(data.allTimeSpanDays ?? 0);
        setCashOnHand(data.cashOnHand ?? null);
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

  /**
   * Closes the help tooltip when the user clicks anywhere outside of it.
   * Only active while the tooltip is open.
   */
  useEffect(() => {
    if (!isCashTooltipOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        cashHelpRef.current &&
        !cashHelpRef.current.contains(e.target as Node)
      ) {
        setIsCashTooltipOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isCashTooltipOpen]);

  // ─── Initial-load skeleton ───────────────────────────────────
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
      {/* ─── Header: title + optional time selector ───────────── */}
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

      {/* ─── Chart body, dimmed while refreshing ──────────────── */}
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

      {/* ─── Total balance ─────────────────────────────────────── */}
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

      {/* ─── Optional: cash on hand (excludes Book accounts) ──── */}
      {showCashOnHand && cashOnHand !== null && (
        <div className="flex gap-1.5 mr-auto items-center text-secondary -mt-2">
          {/* Help icon sits to the right of the label (rightmost in RTL) */}
          <div className="relative" ref={cashHelpRef}>
            <button
              type="button"
              aria-label="توضیح موجودی در دسترس"
              aria-expanded={isCashTooltipOpen}
              onClick={() => setIsCashTooltipOpen((v) => !v)}
              className="grid place-content-center cursor-pointer"
            >
              <Info
                height={16}
                width={16}
                className="fill-secondary hover:fill-primary transition-colors"
              />
            </button>

            {isCashTooltipOpen && (
              <div
                role="tooltip"
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 text-[10px] leading-5 text-center bg-white border border-elements-border rounded-2xl p-3 shadow-lg z-50 animate-fade-in"
              >
                {CASH_TOOLTIP_TEXT}
              </div>
            )}
          </div>

          <span className="text-[10px]">در دسترس:</span>
          <span
            className={`text-xs font-medium transition-opacity duration-200 ${
              isRefreshing ? "opacity-50" : "opacity-100"
            }`}
          >
            {cashOnHand.toLocaleString("fa-ir")} ﷼
          </span>
        </div>
      )}

      {/* ─── Optional: footer link ─────────────────────────────── */}
      {link && <Button href={link} className="mt-4">{linkTitle || ""}</Button>}
    </Box>
  );
}
