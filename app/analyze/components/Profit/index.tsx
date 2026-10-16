/**
 * @fileoverview Profit & Loss Tab
 *
 * Renders the "سود و زیان" tab of the analyze screen. Two stacked blocks:
 *
 * 1. **Waterfall chart** — monthly cumulative profit/loss for the current
 *    Jalali year, rendered by {@link WaterfallChart}.
 * 2. **Summary rows** — start balance, income, expense, net profit, and
 *    end balance, with the user's **current cash-on-hand** figure shown
 *    beneath the end-balance row as a sub-item.
 *
 * Cash-on-hand is the user's liquid money (excluding `Book` accounts such
 * as receivables, payables, and funds-in-transit). It is not scoped to the
 * selected window — it always represents the present value — but is
 * displayed here so it sits right next to the current end balance.
 *
 * @module app/analyze/components/Profit
 */

"use client";

import Box from "@/components/Box";
import WaterfallChart from "@/components/WaterfallChart";
import type { ProfitMetrics, WaterfallDataShape } from "../../page";

/**
 * Discriminated union of row entries rendered in the summary block.
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
  /** Monthly waterfall dataset for the current Jalali year. */
  waterfall: WaterfallDataShape | undefined;
  /** When true, renders the skeleton state. */
  isLoading: boolean;
};

/**
 * Renders the profit/loss summary for the analyze screen.
 *
 * @param props - See {@link ProfitProps}.
 * @returns The rendered Profit tab.
 */
export default function Profit({ data, waterfall, isLoading }: ProfitProps) {
  // ─── Skeleton ────────────────────────────────────────────────
  if (isLoading || !data || !waterfall) {
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

  // ─── Summary rows ────────────────────────────────────────────
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

  return (
    <div className="w-full flex flex-col gap-5">
      {/* ─── Waterfall chart ────────────────────────────────── */}
      <Box className="gap-3">
        <h3 className="text-xs text-secondary">
          روند سود و زیان ماهانه -{" "}
          {new Date().toLocaleString("fa-ir", { year: "numeric" })}
        </h3>
        <WaterfallChart data={waterfall as any} />
      </Box>

      {/* ─── Summary rows ───────────────────────────────────── */}
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
    </div>
  );
}
