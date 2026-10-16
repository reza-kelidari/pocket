"use client";
import ChartContainer from "@/components/ChartContainer";
import IncomeVsExpense from "./components/IncomeVsExpense";
import type { CashflowMetrics } from "../../page";

export default function CashFlow({
  timeParam,
  data,
  isLoading,
}: {
  timeParam: number;
  data: CashflowMetrics | undefined;
  isLoading: boolean;
}) {
  // Show a zero-metrics skeleton while loading so child components can render
  const metrics: CashflowMetrics = data ?? {
    currentIncome: 0,
    currentExpense: 0,
    pastIncome: 0,
    pastExpense: 0,
    isAllTime: timeParam === 36500,
  };

  return (
    <div className="w-full flex flex-col gap-15">
      <ChartContainer title="روند موجودی" time={timeParam} showCashOnHand />
      <IncomeVsExpense
        variant="current"
        metrics={metrics}
        isLoading={isLoading}
      />
      {!metrics.isAllTime && (
        <IncomeVsExpense
          variant="past"
          metrics={metrics}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
