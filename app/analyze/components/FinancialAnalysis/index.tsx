/**
 * @fileoverview Financial Analysis Tab
 *
 * Renders one side (income or expense) of the Financial Analysis tab in
 * the analyze screen. Three stacked blocks:
 *
 * 1. **Donut chart** — share of each category in the selected window,
 *    with a compact legend listing each category's percentage.
 * 2. **Details tree** — grouped by parent category, each category
 *    expanded into its per-tag split (or a single "بدون برچسب" row).
 *    Each category row links to the transactions list pre-filtered to
 *    that category and window.
 * 3. **Forecast chart** — cumulative history plus projected values for
 *    four forecasting methods; the user picks the active method from a
 *    dropdown without re-fetching.
 *
 * The `type` prop selects the side (`"income"` / `"expense"`) and swaps
 * the palette and copy accordingly.
 *
 * @module app/analyze/components/FinancialAnalysis
 */

"use client";

import { memo, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@/components/Box";
import DonutChart from "@/components/DonutChart";
import AnalyzeIncomeLoading from "@/components/Skeletons/AnalyzeIncomeLoading";
import { filterToUrl } from "@/app/transactions/methods";
import type { BreakdownData, ChartSlice } from "../../page";
import ForecastChart from "../ForecastChart";
import type { ForecastMethod } from "@/utility/shared/forecastMethods";

/**
 * Static configuration for each analysis side.
 *
 * Defines the palette, the tailwind class names used for the legend
 * dots, the section titles, and the empty-state copy.
 */
const CONFIG = {
  income: {
    colors: ["#009764", "#19af7c", "#55c28b", "#79d99e", "#97e3ba"] as const,
    dotClasses: [
      "bg-income-primary",
      "bg-income-second",
      "bg-income-third",
      "bg-income-forth",
      "bg-income-fifth",
    ] as const,
    title: "سهم منابع درآمدی",
    detailsTitle: "جزئیات درآمدها",
    forecastTitle: "پیش‌بینی روند درآمد",
    emptyText: "در این بازه درآمدی ثبت نشده است.",
    primaryColorClass: "text-income-primary",
    forecastColor: "#009764",
  },
  expense: {
    colors: ["#a40000", "#b42a2a", "#c25555", "#d97979", "#e39797"] as const,
    dotClasses: [
      "bg-expense-primary",
      "bg-expense-second",
      "bg-expense-third",
      "bg-expense-forth",
      "bg-expense-fifth",
    ] as const,
    title: "سهم منابع هزینه‌ای",
    detailsTitle: "جزئیات هزینه‌ها",
    forecastTitle: "پیش‌بینی روند هزینه",
    emptyText: "در این بازه هزینه‌ای ثبت نشده است.",
    primaryColorClass: "text-expense-primary",
    forecastColor: "#a40000",
  },
} as const;

/** Discriminator for which side of the analysis this instance renders. */
type AnalysisType = keyof typeof CONFIG;

/** Slice enriched with presentation color/class (added client-side). */
type DecoratedSlice = ChartSlice & { color: string; dotClass: string };

/**
 * Renders the income or expense analysis tab.
 *
 * @param props - Component props.
 * @param props.type - Which side of the analysis to render.
 * @param props.timeParam - The active time-window selector value.
 * @param props.data - The breakdown payload from `/api/analyze`.
 * @param props.isLoading - When `true`, renders the skeleton state.
 * @returns The rendered analysis tab.
 */
function FinancialAnalysis({
  type,
  timeParam,
  data,
  isLoading,
}: {
  type: AnalysisType;
  timeParam: number;
  data: BreakdownData | undefined;
  isLoading: boolean;
}) {
  const conf = CONFIG[type];
  const router = useRouter();
  const [forecastMethod, setForecastMethod] = useState<ForecastMethod>("sma");

  /**
   * Navigates to the transactions list, pre-filtered to the tapped
   * category and the current time window.
   *
   * @param categoryId - The numeric id of the category that was tapped.
   */
  const handleCategoryClick = (categoryId: number) => {
    const url = `/transactions${filterToUrl({
      timeWindow: timeParam,
      accounts: [],
      categories: [String(categoryId)],
      tags: [],
    })}`;
    router.push(url);
  };

  /** Category slices decorated with their palette color and dot class. */
  const decoratedSlices: DecoratedSlice[] = useMemo(() => {
    if (!data) return [];
    return data.chartSlices.map((slice, i) => ({
      ...slice,
      color: conf.colors[i] ?? conf.colors[conf.colors.length - 1],
      dotClass:
        conf.dotClasses[i] ?? conf.dotClasses[conf.dotClasses.length - 1],
    }));
  }, [data, conf]);

  /** Donut-chart payload derived from the decorated slices. */
  const donutData = useMemo(
    () => decoratedSlices.map((s) => ({ percent: s.percent, color: s.color })),
    [decoratedSlices],
  );

  if (isLoading || !data) {
    return <AnalyzeIncomeLoading />;
  }

  /**
   * Converts a category amount into its percentage of the total, rounded
   * to one decimal place for display.
   *
   * @param amount - The category amount in Rials.
   * @returns The percentage of the total, or `0` when the total is `0`.
   */
  const getCategoryPercent = (amount: number) => {
    if (data.totalAmount === 0) return 0;
    return Number(((amount / data.totalAmount) * 100).toFixed(1));
  };

  return (
    <div className="w-full flex flex-col gap-15">
      {/* ─── Donut chart ─────────────────────────────────────── */}
      <Box className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs text-secondary">{conf.title}</span>
          <span className={`text-sm font-bold ${conf.primaryColorClass}`}>
            {data.totalAmount.toLocaleString("fa-IR")} ﷼
          </span>
        </div>
        {data.totalAmount > 0 ? (
          <div className="flex items-center gap-6 mt-4">
            <DonutChart data={donutData} />
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {decoratedSlices.map((slice) => {
                const pct = getCategoryPercent(slice.amount);
                return (
                  <div
                    key={String(slice.id)}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`p-1.5 rounded-full shrink-0 ${slice.dotClass}`}
                    />
                    <span
                      className={`text-xs ${
                        pct > 10 && slice.id !== "other"
                          ? "text-black"
                          : "text-secondary"
                      } truncate`}
                    >
                      {pct.toLocaleString("fa-IR")}٪ - {slice.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-xs text-secondary text-center mt-6 py-2">
            {conf.emptyText}
          </p>
        )}
      </Box>

      {/* ─── Details tree ────────────────────────────────────── */}
      <Box className="gap-10">
        <h3 className="text-xs text-secondary">{conf.detailsTitle}</h3>
        {data.details.length === 0 ? (
          <p className="text-xs text-secondary text-center py-4">
            {conf.emptyText}
          </p>
        ) : (
          data.details.map((group) => (
            <div key={group.id} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-black">
                    {group.name}
                  </span>
                  <span className="text-xs font-bold text-black">
                    {group.amount.toLocaleString("fa-IR")} ﷼
                  </span>
                </div>
                <div className="h-px w-full bg-elements-border" />
              </div>
              <div className="flex flex-col gap-6">
                {group.categories.map((cat) => {
                  const showTagTree =
                    cat.tags.length > 0 || cat.untaggedAmount > 0;
                  return (
                    <div key={cat.id} className="flex flex-col gap-2.5">
                      <div
                        className="flex items-center justify-between cursor-pointer rounded-xl px-2 py-1.5 -mx-2 transition-colors active:bg-elements-background"
                        onClick={() => handleCategoryClick(cat.id)}
                      >
                        <span className="text-xs text-secondary">
                          {cat.name}
                        </span>
                        <span className="text-xs text-secondary">
                          {cat.amount.toLocaleString("fa-IR")} ﷼
                        </span>
                      </div>
                      {showTagTree && (
                        <div className="relative flex flex-col gap-1 mr-2 pr-2">
                          <div className="absolute right-0 top-1 bottom-1 w-0.5 rounded-full bg-secondary/40" />
                          {cat.tags.map((tag) => (
                            <div
                              key={tag.tagId}
                              className="flex items-center justify-between py-1"
                            >
                              <span className="text-[10px] text-secondary">
                                {tag.tagName}
                              </span>
                              <span className="text-[10px] text-secondary">
                                {tag.amount.toLocaleString("fa-IR")} ﷼
                              </span>
                            </div>
                          ))}
                          {cat.untaggedAmount > 0 && (
                            <div className="flex items-center justify-between py-1">
                              <span className="text-[10px] text-secondary">
                                بدون برچسب
                              </span>
                              <span className="text-[10px] text-secondary">
                                {cat.untaggedAmount.toLocaleString("fa-IR")} ﷼
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </Box>

      {/* ─── Forecast chart ──────────────────────────────────── */}
      {data.forecast && (
        <ForecastChart
          historical={data.forecast.historical}
          byMethod={data.forecast.byMethod}
          selectedMethod={forecastMethod}
          onSelectMethod={setForecastMethod}
          primaryColor={conf.forecastColor}
          title={conf.forecastTitle}
        />
      )}
    </div>
  );
}

export default memo(FinancialAnalysis);
