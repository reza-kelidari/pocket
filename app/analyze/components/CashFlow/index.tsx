"use client";
import { useMemo } from "react";
import ChartContainer from "@/components/ChartContainer";
import IncomeVsExpense from "./components/IncomeVsExpense";
import { TransactionType } from "@/utility/shared/transactionTypes";
import {
  getCutoffTimestamp,
  jalaliToTimestamp,
  toJalaliDateArray,
} from "@/utility/shared/timeMethods";

const ALL_TIME_PARAM = 36500;

export default function CashFlow({
  timeParam,
  transactions,
  isLoading,
}: {
  timeParam: number;
  transactions: TransactionType[];
  isLoading: boolean;
}) {
  const metrics = useMemo(() => {
    const now = Date.now();
    const nowJalali = toJalaliDateArray(new Date(now));
    const [jYear, jMonth, jDay] = nowJalali;

    let currentCutoff = 0;
    let pastCutoff = 0;
    let currentEnd = now;
    let pastEnd = 0;
    let needPast = timeParam !== ALL_TIME_PARAM;

    if (timeParam === ALL_TIME_PARAM) {
      needPast = false;
    } else if (timeParam === -1) {
      currentCutoff = jalaliToTimestamp([jYear, jMonth, 1]);

      let prevMonth = jMonth - 1;
      let prevYear = jYear;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      pastCutoff = jalaliToTimestamp([prevYear, prevMonth, 1]);
      pastEnd = currentCutoff - 1;
    } else if (timeParam === -2) {
      currentCutoff = jalaliToTimestamp([jYear, 1, 1]);
      pastCutoff = jalaliToTimestamp([jYear - 1, 1, 1]);
      pastEnd = currentCutoff - 1;
    } else {
      currentCutoff = getCutoffTimestamp(timeParam);
      const duration = currentEnd - currentCutoff;
      pastCutoff = currentCutoff - duration;
      pastEnd = currentCutoff - 1;
    }

    let currentIncome = 0;
    let currentExpense = 0;
    let pastIncome = 0;
    let pastExpense = 0;

    for (const tx of transactions) {
      const t = tx.time;
      if (t >= currentCutoff && t <= currentEnd) {
        if (tx.type === "debit") currentIncome += tx.value;
        else if (tx.type === "credit") currentExpense += tx.value;
      } else if (needPast && t >= pastCutoff && t <= pastEnd) {
        if (tx.type === "debit") pastIncome += tx.value;
        else if (tx.type === "credit") pastExpense += tx.value;
      }
    }

    return {
      currentIncome,
      currentExpense,
      pastIncome,
      pastExpense,
      isAllTime: timeParam === ALL_TIME_PARAM,
    };
  }, [transactions, timeParam]);

  return (
    <div className="w-full flex flex-col gap-15">
      <ChartContainer title="روند موجودی" days={timeParam} />
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
