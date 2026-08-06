"use client";

import { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";
import { useRef, useState, useEffect } from "react";

type BalancePoint = {
  time: number;
  balance: number;
};

interface BalanceChartProps {
  data: BalancePoint[];
  daysFilter: number;
  color?: AccountColorType;
  showTooltip?: boolean;
  lastBalance: number;
  minPointDistance?: number;
}

export default function BalanceChart({
  data,
  color,
  daysFilter,
  showTooltip = true,
  lastBalance,
  minPointDistance = 20,
}: BalanceChartProps) {
  const chartColor = color
    ? AccountColors[color].primaryValue
    : PrimaryColors.primary.primaryValue;

  const tooltipColors = color
    ? {
        border: AccountColors[color].border,
        background: AccountColors[color].surface,
      }
    : { border: PrimaryColors.primary.box, background: "" };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const [containerWidth, setContainerWidth] = useState(300);
  const [contentLeft, setContentLeft] = useState(0);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    date: string;
  } | null>(null);

  const height = 140;

  useEffect(() => {
    const updateLayout = () => {
      if (wrapperRef.current) {
        setContainerWidth(wrapperRef.current.clientWidth);
      }
      if (innerRef.current && wrapperRef.current) {
        setContentLeft(
          innerRef.current.getBoundingClientRect().left -
            wrapperRef.current.getBoundingClientRect().left,
        );
      }
    };

    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  const ONE_DAY = 1000 * 3600 * 24;
  const filterStartTime = Date.now() - ONE_DAY * daysFilter;

  // پیدا کردن موجودی روز قبل از شروع بازه فیلتر (برای پر کردن روزهای خالی)
  let startingBalance = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i].time < filterStartTime) {
      startingBalance = data[i].balance;
    } else {
      break;
    }
  }

  // 🟢 ساخت آرایه‌ای که برای هر روز یک نقطه دارد
  const chartData: BalancePoint[] = [];
  const filteredData = data.filter((item) => item.time >= filterStartTime);

  let dataIdx = 0;
  let currentDay = filterStartTime;
  const today = Date.now();
  let currentBalance = startingBalance;

  while (currentDay <= today) {
    // اگر در این روز تراکنشی بود، موجودی را با آخرین موجودی آن روز آپدیت کن
    while (
      dataIdx < filteredData.length &&
      new Date(filteredData[dataIdx].time).setHours(0, 0, 0, 0) ===
        new Date(currentDay).setHours(0, 0, 0, 0)
    ) {
      currentBalance = filteredData[dataIdx].balance;
      dataIdx++;
    }

    // اضافه کردن نقطه برای این روز
    chartData.push({ time: currentDay, balance: currentBalance });
    currentDay += ONE_DAY;
  }

  if (chartData.length === 0) {
    chartData.push(
      { time: filterStartTime, balance: lastBalance },
      { time: Date.now(), balance: lastBalance },
    );
  }

  // محاسبه عرض بر اساس تعداد روزها (چون هر روز یک نقطه دارد)
  const paddingX = minPointDistance / 2;
  const requiredWidth =
    (chartData.length - 1) * minPointDistance + paddingX * 2;
  const svgWidth = Math.max(containerWidth, requiredWidth);
  const usableWidth = Math.max(1, svgWidth - paddingX * 2);

  const values = chartData.map((item) => item.balance);
  let minBalance = Math.min(...values);
  let maxBalance = Math.max(...values);

  if (minBalance === maxBalance) {
    minBalance -= 1000;
    maxBalance += 1000;
  } else {
    const padding = (maxBalance - minBalance) * 0.08;
    minBalance -= padding;
    maxBalance += padding;
  }

  // چون هر روز یک نقطه دارد، می‌توانیم ایندکس را برای محور X استفاده کنیم
  const points = chartData.map((item, index) => {
    const x =
      paddingX + (index / Math.max(1, chartData.length - 1)) * usableWidth;
    const y =
      height -
      ((item.balance - minBalance) / (maxBalance - minBalance)) * height;

    return {
      x: x,
      y: y,
      balance: item.balance,
      date: new Date(item.time).toLocaleDateString("fa-IR"),
    };
  });

  let path = `M ${points[0].x}, ${points[0].y}`;
  for (let index = 0; index < points.length - 1; index++) {
    const p0 = index > 0 ? points[index - 1] : points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = index < points.length - 2 ? points[index + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  const areaPath =
    path +
    ` L ${points[points.length - 1].x},${height} L ${points[0].x}, ${height} Z`;

  const handleTooltip = (p: any) =>
    setTooltip({ x: p.x, y: p.y, value: p.balance, date: p.date });

  const handleScroll = () => {
    if (innerRef.current && wrapperRef.current) {
      setContentLeft(
        innerRef.current.getBoundingClientRect().left -
          wrapperRef.current.getBoundingClientRect().left,
      );
    }
  };

  useEffect(() => {
    handleScroll();
  }, [svgWidth, containerWidth]);

  return (
    <div className="w-full max-w-full min-w-0 relative" ref={wrapperRef}>
      <div
        className="overflow-x-auto scrollbar-none w-full"
        style={{ height: height }}
        onScroll={handleScroll}
      >
        <div
          className="relative"
          style={{ width: svgWidth, height: height }}
          ref={innerRef}
        >
          <svg
            height={height}
            width={svgWidth}
            viewBox={`0 0 ${svgWidth} ${height}`}
            preserveAspectRatio="none"
            overflow="visible"
          >
            <defs>
              <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.25} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>

            <path d={areaPath} fill="url(#grad)" />
            <path d={path} stroke={chartColor} strokeWidth={2.5} fill="none" />

            {/* رندر کردن نقطه (دایره) برای هر روز */}
            {points.map((p, i) => (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={chartColor}
                  stroke="#ffffff"
                  strokeWidth="2"
                />
                <rect
                  x={p.x - minPointDistance / 2}
                  y={0}
                  width={minPointDistance}
                  height={height}
                  fill="transparent"
                  onPointerEnter={() => handleTooltip(p)}
                  onPointerMove={() => handleTooltip(p)}
                  onMouseEnter={() => handleTooltip(p)}
                  onMouseLeave={() => setTooltip(null)}
                  style={{ cursor: "pointer" }}
                />
              </g>
            ))}
          </svg>
        </div>
      </div>

      {showTooltip && tooltip && (
        <div
          className={`absolute flex flex-col items-center gap-2 ${tooltipColors.background} ${tooltipColors.border} border shadow-md text-black backdrop-blur-sm p-2 text-xs z-20 whitespace-nowrap pointer-events-none rounded-2xl`}
          style={{
            left: `${contentLeft + tooltip.x}px`,
            top: `${tooltip.y - 45}px`,
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.value.toLocaleString("fa-IR")} ﷼
          <span className="text-secondary">{tooltip.date}</span>
        </div>
      )}
    </div>
  );
}
