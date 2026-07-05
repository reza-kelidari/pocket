"use client";

import { AccountColorType } from "@/features/accounts/types";
import { AccountColors, PrimaryColors } from "@/features/colors";
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
}

export default function BalanceChart({
  data,
  color,
  daysFilter,
  showTooltip = true,
  lastBalance,
}: BalanceChartProps) {
  const chartColor = color
    ? AccountColors[color].primaryValue
    : PrimaryColors.primary.primaryValue;

    const tooltipColors = color
    ? {border: AccountColors[color].border, background: AccountColors[color].surface}
    : {border: PrimaryColors.primary.box, background: ""}

  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: number;
    date: string;
  } | null>(null);
  const [width, setWidth] = useState(300);
  const height = 140;

  useEffect(() => {
    const updateWidth = () => {
      if (svgRef.current?.parentElement) {
        setWidth(svgRef.current.parentElement.scrollWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  /**
   * Filtered data based on user's selection
   *
   * `1000` (Miliseconds in a Second) * `3600` (Seconds in an Hour) * `24` (Hours in a Day) *
   * {@link daysFilter} (User's Selection)
   */
  let chartData = data.filter(
    (item) => item.time > Date.now() - 1000 * 3600 * 24 * daysFilter,
  );

  if (!chartData || chartData.length === 0) {
    chartData = [
      {
        time: Date.now() - 1000 * 3600 * 24 * daysFilter,
        balance: lastBalance,
      },
      {
        time: Date.now(),
        balance: lastBalance,
      },
    ];
  }

  const values = [...chartData].map((item) => item.balance);

  /**
   * Calculating lowest balance
   */
  let minBalance = Math.min(...values);

  /**
   * Calculating highest balance
   */
  let maxBalance = Math.max(...values);

  /**
   * Padding
   */
  if (minBalance === maxBalance) {
    minBalance -= 1000;
    maxBalance += 1000;
  } else {
    const padding = (maxBalance - minBalance) * 0.08;
    minBalance -= padding;
    maxBalance += padding;
  }

  /**
   * Calculating points position for every balance item
   */
  const points = chartData.map((item, index) => {
    /**
     * What position this point is, in x vector? * `width`
     */
    const x = (index / (chartData.length - 1)) * width;

    /**
     * What position this point is, in y vector? * `height`, -120 becuase (0, 0) in
     * chart is top left corner
     */
    const y =
      height -
      ((item.balance - minBalance) / (maxBalance - minBalance)) * height;

    return {
      x: x,
      y: y,
      balance: item.balance,
      date: new Date(item.time).toLocaleDateString("fa-ir"),
    };
  });

  /**
   * Start point
   */
  let path = `M ${points[0].x}, ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index++) {
    /**
     * Declaring points
     */

    /**
     * Previus point, but if we are in first point, choosing this point
     */
    const p0 = index > 0 ? points[index - 1] : points[index];

    /**
     * Current point
     */
    const p1 = points[index];

    /**
     * Next point
     */
    const p2 = points[index + 1];

    /**
     * Two points ahead, but if we too close to end, choosing `p2`
     */
    const p3 = index < points.length - 2 ? points[index + 2] : p2;

    /**
     * Softing line between points by Bezier Curve
     */
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  const areaPath = path + ` L ${width},${height} L 0, ${height} Z`;

  return (
    <div className="relative">
      <svg
        height="100%"
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        ref={svgRef}
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

        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill={chartColor}
              stroke="#fff"
              strokeWidth="2"
            />
            <circle
              cx={p.x}
              cy={p.y}
              width={12}
              height={30}
              r={15}
              fill="transparent"
              onMouseEnter={() =>
                setTooltip({ x: p.x, y: p.y, value: p.balance, date: p.date })
              }
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}
            />
          </g>
        ))}
      </svg>
      {showTooltip && tooltip && (
        <div
          className={`absolute flex flex-col items-center gap-2 ${tooltipColors.background} ${tooltipColors.border} border shadow-md text-black backdrop-blur-sm p-2 text-xs z-10 whitespace-nowrap pointer-events-none rounded-2xl`}
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100 - 45}%`,
            transform: "translateX(-50%)",
          }}
        >
          {tooltip.value.toLocaleString("fa-ir")} ﷼
          <span className="text-secondary">{tooltip.date}</span>
        </div>
      )}
    </div>
  );
}
