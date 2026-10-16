/**
 * @fileoverview Profit & Loss Tab
 *
 * Renders the "سود و زیان" tab of the analyze screen. Three stacked
 * blocks:
 *
 * 1. **Waterfall chart** — monthly cumulative profit/loss for the
 *    current Jalali year, rendered by {@link WaterfallChart}. The chart
 *    can be extended into the remaining months of the year using one
 *    of four forecasting methods; the user picks the method from a
 *    dropdown that includes a "بدون پیش‌بینی" (no forecast) option,
 *    which is also the default.
 * 2. **Historical summary rows** — start balance, income, expense, net
 *    profit, end balance, plus the user's current cash-on-hand figure
 *    shown beneath the end-balance row as a sub-item.
 * 3. **Forecast summary** — end-of-period balance, forecasted income,
 *    forecasted expense, forecasted net profit/loss, and the projected
 *    balance. Only rendered when a forecast method is selected.
 *
 * ### Chart vs. summary scoping
 *
 * The **chart** always reflects the whole current Jalali year: twelve
 * monthly columns, with the remaining months filled by predictions from
 * the selected method (or left as historical when "بدون پیش‌بینی" is
 * chosen).
 *
 * The **summary** block, in contrast, is scoped to the *target window's*
 * forecast horizon — the same horizon the Income and Expense tabs use.
 * This means a user looking at "۳۰ روز گذشته" sees a 30-day-ahead
 * projection in the summary, even though the chart itself runs through
 * the end of the year. The per-method totals are precomputed by the API
 * (see `profitForecast` in `/api/analyze`) so the client can swap
 * methods without a round-trip.
 *
 * Cash-on-hand is the user's liquid money (excluding `Book` accounts
 * such as receivables, payables, and funds-in-transit). It is not scoped
 * to the selected window — it always represents the present value — but
 * is displayed here so it sits right next to the current end balance.
 *
 * ### Hook ordering
 *
 * The component calls **every** hook before any conditional return, as
 * required by the Rules of Hooks. The memoized values that depend on
 * `data` / `waterfall` guard against those being undefined internally,
 * rather than deferring the hook call itself.
 *
 * @module app/analyze/components/Profit
 */

"use client";

import { useMemo, useState } from "react";
import Box from "@/components/Box";
import WaterfallChart from "@/components/WaterfallChart";
import TimeWindow from "@/components/TimeWindow";
import Left from "@/icons/Left";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import {
  FORECAST_METHODS,
  type ForecastMethod,
} from "@/utility/shared/forecastMethods";
import type {
  ProfitForecastMap,
  ProfitMetrics,
  WaterfallDataShape,
  WaterfallForecastMap,
} from "../../page";

/**
 * Discriminated union of the values the forecast-method picker can hold.
 *
 * `"none"` disables forecasting entirely; the remaining values mirror
 * {@link ForecastMethod}.
 */
type ForecastChoice = ForecastMethod | "none";

/**
 * Ordered options for the forecast-method picker.
 *
 * "بدون پیش‌بینی" is intentionally first so it is also the initial
 * selection, matching the tab's default state.
 */
const FORECAST_OPTIONS: { value: ForecastChoice; label: string }[] = [
  { value: "none", label: "بدون پیش‌بینی" },
  ...FORECAST_METHODS.map((m) => ({ value: m.value, label: m.label })),
];

/**
 * Discriminated union of row entries rendered in the historical summary
 * block.
 *
 * - `row`       — a labelled numeric value.
 * - `separator` — a thin horizontal divider.
 */
type RowType =
  | {
      kind: "row";
      label: string;
      value: number;
      color: string;
      prefix?: string;
    }
  | { kind: "separator" };

/**
 * Props accepted by {@link Profit}.
 */
type ProfitProps = {
  /** Period metrics (income, expense, profit, start/end balance, cash). */
  data: ProfitMetrics | undefined;
  /** Pure-historical waterfall dataset for the current Jalali year. */
  waterfall: WaterfallDataShape | undefined;
  /** Precomputed waterfall datasets for each supported method (chart). */
  waterfallForecast: WaterfallForecastMap | undefined;
  /** Precomputed forecast totals per method, scoped to the target window. */
  profitForecast: ProfitForecastMap | undefined;
  /** When true, renders the skeleton state. */
  isLoading: boolean;
};

/**
 * Values derived from the currently-active forecast entry that feed the
 * forecast summary block.
 */
type ForecastSummary = {
  /** Balance at the end of the selected window (baseline for forecasts). */
  endBalance: number;
  /** Sum of predicted income across the horizon. */
  income: number;
  /** Sum of predicted expense across the horizon. */
  expense: number;
  /** Predicted net profit/loss (`income − expense`). */
  profit: number;
  /** Projected balance at the end of the horizon. */
  projectedBalance: number;
};

/**
 * Renders the profit/loss summary for the analyze screen.
 *
 * @param props - See {@link ProfitProps}.
 * @returns The rendered Profit tab.
 */
export default function Profit({
  data,
  waterfall,
  waterfallForecast,
  profitForecast,
  isLoading,
}: ProfitProps) {
  // ─── All hooks must run before any conditional return ────────
  const [forecastChoice, setForecastChoice] = useState<ForecastChoice>("none");
  const tw = useTimeWindow();

  /**
   * The waterfall dataset currently driving the chart. When no forecast
   * method is selected, this is the pure-historical dataset; otherwise
   * it is the precomputed forecast for the chosen method, falling back
   * to the historical dataset if the forecast is unavailable.
   */
  const activeWaterfall: WaterfallDataShape | undefined = useMemo(() => {
    if (!waterfall) return undefined;
    if (forecastChoice === "none") return waterfall;
    return waterfallForecast?.[forecastChoice] ?? waterfall;
  }, [forecastChoice, waterfall, waterfallForecast]);

  /**
   * Forecast summary derived from the API's per-method totals, which are
   * already scoped to the target window's horizon (matching the
   * income/expense tabs).
   *
   * Returns `null` when no forecast method is selected or when the API
   * did not supply the expected entry (e.g. a stale cached response).
   */
  const forecastSummary: ForecastSummary | null = useMemo(() => {
    if (forecastChoice === "none") return null;
    if (!data || !profitForecast) return null;
    const entry = profitForecast[forecastChoice];
    if (!entry) return null;
    return {
      endBalance: data.endBalance,
      income: entry.income,
      expense: entry.expense,
      profit: entry.profit,
      projectedBalance: entry.projectedBalance,
    };
  }, [forecastChoice, data, profitForecast]);

  // ─── Skeleton (safe to return early now) ─────────────────────
  if (isLoading || !data || !waterfall || !activeWaterfall) {
    return (
      <div className="w-full flex flex-col gap-5">
        <Box className="flex flex-col gap-4 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-32 bg-elements-background rounded animate-pulse" />
              <div className="h-4 w-24 bg-elements-background rounded animate-pulse" />
            </div>
          ))}
        </Box>
      </div>
    );
  }

  // ─── Method picker options ───────────────────────────────────
  const methodOptions = FORECAST_OPTIONS.map((opt, i) => ({
    name: opt.label,
    time: i,
  }));
  const selectedIndex = Math.max(
    0,
    FORECAST_OPTIONS.findIndex((o) => o.value === forecastChoice),
  );
  const selectedLabel =
    FORECAST_OPTIONS[selectedIndex]?.label ?? "بدون پیش‌بینی";

  // ─── Historical summary rows ─────────────────────────────────
  const rows: RowType[] = [
    {
      kind: "row",
      label: "موجودی در ابتدای دوره",
      value: data.startBalance,
      color: "text-black",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: "درآمد‌ها",
      value: data.income,
      color: "text-income-primary",
    },
    {
      kind: "row",
      label: "هزینه‌ها",
      value: data.expense,
      color: "text-expense-primary",
    },
    { kind: "separator" },
    {
      kind: "row",
      label: data.profit >= 0 ? "سود دوره" : "زیان دوره",
      value: Math.abs(data.profit),
      color: data.profit >= 0 ? "text-income-primary" : "text-expense-primary",
      prefix: data.profit >= 0 ? "+" : "-",
    },
    {
      kind: "row",
      label: "موجودی در پایان دوره",
      value: data.endBalance,
      color: "text-black",
    },
  ];

  const forecastLabelClass =
    forecastSummary && forecastSummary.profit >= 0
      ? "text-income-primary"
      : "text-expense-primary";

  return (
    <div className="w-full flex flex-col gap-5">
      {/* ─── Waterfall chart + method picker ─────────────────── */}
      <Box className="gap-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs text-secondary">
            روند سود و زیان ماهانه -{" "}
            {new Date().toLocaleString("fa-ir", { year: "numeric" })}
          </h3>

          <div className="relative" ref={tw.dropdownRef}>
            <button
              type="button"
              onClick={tw.toggle}
              className="border border-elements-border bg-elements-background px-2.5 py-1.5 rounded-2xl text-[11px] flex items-center gap-1 text-nowrap cursor-pointer"
            >
              {selectedLabel}
              <Left height={11} width={11} className="fill-current" />
            </button>
            <TimeWindow
              isMounted={tw.isMounted}
              isVisible={tw.isVisible}
              options={methodOptions}
              onSelect={(i) => {
                setForecastChoice(FORECAST_OPTIONS[i].value);
                tw.close();
              }}
              activeTime={selectedIndex}
              align="left"
            />
          </div>
        </div>

        <WaterfallChart data={activeWaterfall as any} />
      </Box>

      {/* ─── Historical summary rows ─────────────────────────── */}
      <Box className="gap-4">
        {rows.map((row, i) => {
          if (row.kind === "separator") {
            return <div key={`sep-${i}`} className="h-px bg-elements-border" />;
          }
          return (
            <div key={i} className="flex items-center justify-between">
              <span className="text-xs text-secondary">{row.label}</span>
              <span className={row.color}>
                <span className="text-sm font-bold">
                  {row.value.toLocaleString("fa-IR")}
                  {row.prefix || ""}{" "}
                </span>
                <span className="text-xs font-normal">﷼</span>
              </span>
            </div>
          );
        })}

        {/* ─── Sub-row: cash on hand (excludes Book accounts) ─── */}
        <div className="flex items-center justify-between -mt-2 pl-4">
          <span className="text-[10px] text-secondary">
            موجودی نقد در دسترس
          </span>
          <span className="text-secondary">
            <span className="text-xs font-medium">
              {data.cashOnHand.toLocaleString("fa-IR")}{" "}
            </span>
            <span className="text-[10px] font-normal">﷼</span>
          </span>
        </div>
      </Box>

      {/* ─── Forecast summary (only when a method is chosen) ─── */}
      {forecastSummary && (
        <Box className="gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs text-secondary">پیش‌بینی</h3>
            <span className="text-[10px] text-secondary">{selectedLabel}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">موجودی در پایان دوره</span>
            <span className="text-black">
              <span className="text-sm font-bold">
                {forecastSummary.endBalance.toLocaleString("fa-IR")}{" "}
              </span>
              <span className="text-xs font-normal">﷼</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">درآمد پیش‌بینی‌شده</span>
            <span className="text-income-primary">
              <span className="text-sm font-bold">
                {forecastSummary.income.toLocaleString("fa-IR")}{" "}
              </span>
              <span className="text-xs font-normal">﷼</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">هزینه‌ی پیش‌بینی‌شده</span>
            <span className="text-expense-primary">
              <span className="text-sm font-bold">
                {forecastSummary.expense.toLocaleString("fa-IR")}{" "}
              </span>
              <span className="text-xs font-normal">﷼</span>
            </span>
          </div>

          <div className="h-px bg-elements-border" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">
              {forecastSummary.profit >= 0
                ? "سود پیش‌بینی‌شده"
                : "زیان پیش‌بینی‌شده"}
            </span>
            <span className={forecastLabelClass}>
              <span className="text-sm font-bold">
                {forecastSummary.profit >= 0 ? "+" : "−"}
                {Math.abs(forecastSummary.profit).toLocaleString("fa-IR")}{" "}
              </span>
              <span className="text-xs font-normal">﷼</span>
            </span>
          </div>

          <div className="h-px bg-elements-border" />

          <div className="flex items-center justify-between">
            <span className="text-xs text-secondary">
              موجودی نهایی پیش‌بینی‌شده
            </span>
            <span className="text-black">
              <span className="text-sm font-bold">
                {forecastSummary.projectedBalance.toLocaleString("fa-IR")}{" "}
              </span>
              <span className="text-xs font-normal">﷼</span>
            </span>
          </div>
        </Box>
      )}
    </div>
  );
}
