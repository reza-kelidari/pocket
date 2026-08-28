export default function DeltaStat({
  align,
  colorClass,
  percent,
  amount,
  isUp,
}: {
  align: "start" | "end";
  colorClass: string;
  percent: number;
  amount: number;
  isUp: boolean;
}) {
  const formattedPercent = Number(Math.abs(percent).toFixed(1)).toLocaleString(
    "fa-IR",
  );
  const formattedAmount = Math.abs(amount).toLocaleString("fa-IR");

  return (
    <div
      className={`flex flex-col gap-1 ${align === "end" ? "items-end" : ""}`}
    >
      <span className={`font-bold ${colorClass}`}>
        ٪{formattedPercent}{" "}
        <span className="text-[10px] font-light text-secondary">
          {isUp ? "افزایش" : "کاهش"}
        </span>
      </span>
      <span className="text-secondary flex items-center gap-1 text-[10px]">
        {align === "end" && (
          <span className={colorClass}>{isUp ? "▲" : "▼"}</span>
        )}
        {formattedAmount} ﷼
        {align === "start" && (
          <span className={colorClass}>{isUp ? "▲" : "▼"}</span>
        )}
      </span>
    </div>
  );
}
