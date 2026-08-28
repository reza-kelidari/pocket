export default function SplitFooter({
  expensePercent,
  expenseAmount,
  incomePercent,
  incomeAmount,
}: {
  expensePercent: number;
  expenseAmount: number;
  incomePercent: number;
  incomeAmount: number;
}) {
  return (
    <div className="flex items-center justify-between w-full text-xs mt-2 pt-3">
      <div className="flex flex-col gap-1">
        <h5 className="text-expense-primary mb-2 font-bold">هزینه‌ها</h5>

        <span className="text-expense-primary font-bold">
          ٪{expensePercent.toLocaleString("fa-IR")}
        </span>
        <span className="text-secondary">
          {expenseAmount.toLocaleString("fa-IR")} ﷼
        </span>
      </div>
      <div className="flex flex-col gap-1 items-end">
        <h5 className="text-income-primary mb-2 font-bold">درآمدها</h5>

        <span className="text-income-primary font-bold">
          ٪{incomePercent.toLocaleString("fa-IR")}
        </span>
        <span className="text-secondary">
          {incomeAmount.toLocaleString("fa-IR")} ﷼
        </span>
      </div>
    </div>
  );
}
