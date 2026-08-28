"use client";

import { useMemo } from "react";
import Box from "@/components/Box";
import SplitGauge from "@/components/SplitGauge";
import SplitFooter from "@/components/SplitFooter";
import DeltaStat from "@/components/DeltaStat";
import { computeSplit, computeDelta } from "@/utility/shared/chartMath";
import AnalyzeIncomeVsExpenseLoading from "@/components/Skeletons/AnalyzeIncomeVsExpenseLoading";

type MetricsType = {
  currentIncome: number;
  currentExpense: number;
  pastIncome: number;
  pastExpense: number;
  isAllTime: boolean;
};

export default function IncomeVsExpense({
  variant,
  metrics,
  isLoading,
}: {
  variant: "current" | "past";
  metrics: MetricsType;
  isLoading: boolean;
}) {
  const isPast = variant === "past";
  const title = isPast
    ? "مقایسه با دوره‌ی مشابه قبل"
    : "مقایسه‌ی درآمد و هزینه در دوره‌ی جاری";

  if (isLoading) {
    return (
      <AnalyzeIncomeVsExpenseLoading>{title}</AnalyzeIncomeVsExpenseLoading>
    );
  }

  if (isPast && metrics.isAllTime) {
    return (
      <Box className="gap-5 items-center justify-center py-8">
        <h3 className="text-secondary text-xs">مقایسه با دوره‌ی مشابه قبل</h3>
        <p className="text-xs text-secondary text-center">
          برای بازه‌ی زمانی «از ابتدا»، مقایسه با دوره‌ی مشابه قبل معنا ندارد.
        </p>
      </Box>
    );
  }

  const currentSplit = useMemo(
    () => computeSplit(metrics.currentIncome, metrics.currentExpense),
    [metrics.currentIncome, metrics.currentExpense],
  );
  const pastSplit = useMemo(
    () => computeSplit(metrics.pastIncome, metrics.pastExpense),
    [metrics.pastIncome, metrics.pastExpense],
  );
  const incomeDelta = useMemo(
    () => computeDelta(metrics.currentIncome, metrics.pastIncome),
    [metrics.currentIncome, metrics.pastIncome],
  );
  const expenseDelta = useMemo(
    () => computeDelta(metrics.currentExpense, metrics.pastExpense),
    [metrics.currentExpense, metrics.pastExpense],
  );

  const expenseColorClass = expenseDelta.isUp
    ? "text-expense-primary"
    : "text-income-primary";
  const incomeColorClass = incomeDelta.isUp
    ? "text-income-primary"
    : "text-expense-primary";

  const activeSplit = isPast ? pastSplit : currentSplit;
  const activeIncome = isPast ? metrics.pastIncome : metrics.currentIncome;
  const activeExpense = isPast ? metrics.pastExpense : metrics.currentExpense;

  return (
    <Box className="gap-5">
      <h3 className="text-secondary text-xs">{title}</h3>

      <div className="relative h-36 min-h-0 shrink-0 -mx-5 -mb-5 overflow-hidden rounded-b-4xl">
        <SplitGauge angle={activeSplit.angle} />
      </div>

      <SplitFooter
        expensePercent={activeSplit.expensePercent}
        expenseAmount={activeExpense}
        incomePercent={activeSplit.incomePercent}
        incomeAmount={activeIncome}
      />

      {isPast && (
        <div className="flex items-center justify-between w-full text-xs pt-3 border-t border-elements-border">
          <DeltaStat
            align="start"
            colorClass={expenseColorClass}
            percent={expenseDelta.percent}
            amount={expenseDelta.amount}
            isUp={expenseDelta.isUp}
          />
          <DeltaStat
            align="end"
            colorClass={incomeColorClass}
            percent={incomeDelta.percent}
            amount={incomeDelta.amount}
            isUp={incomeDelta.isUp}
          />
        </div>
      )}
    </Box>
  );
}
