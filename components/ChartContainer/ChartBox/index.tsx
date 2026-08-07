"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { AccountColorType } from "@/utility/accounts/types";
import { AccountColors, PrimaryColors } from "@/utility/shared/colors";

type BalancePoint = {
  time: number;
  balance: number;
};

type ChartPoint = {
  x: number;
  y: number;
  time: number;
  balance: number;
  date: string;
};

interface BalanceChartProps {
  data: BalancePoint[];
  daysFilter: number;
  color?: AccountColorType;
  showTooltip?: boolean;
  lastBalance: number;
  minPointDistance?: number;
}

const CHART_HEIGHT = 140;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SCROLL_HINT_KEY = "chart-scroll-hint-dismissed";
const HINT_LEAVE_DELAY_MS = 5000;
const HINT_UNMOUNT_DELAY_MS = 5500;

const dateFormatter = new Intl.DateTimeFormat("fa-IR");
const numberFormatter = new Intl.NumberFormat("fa-IR");

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function addDays(time: number, amount: number): number {
  const date = new Date(time);
  date.setDate(date.getDate() + amount);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function formatDate(time: number): string {
  return dateFormatter.format(new Date(time));
}

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function safeGetSessionItem(key: string): string | null {
  if (typeof window === "undefined") return null;

  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetSessionItem(key: string, value: string): void {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function sortPoints(data: BalancePoint[]): BalancePoint[] {
  return [...data].sort((a, b) => a.time - b.time);
}

function buildDailySeries(
  data: BalancePoint[],
  daysFilter: number,
  fallbackBalance: number,
  now: number,
): BalancePoint[] {
  const safeDays = Math.max(
    0,
    Math.floor(Number.isFinite(daysFilter) ? daysFilter : 0),
  );

  const filterStartTime = now - safeDays * ONE_DAY_MS;
  const sortedData = sortPoints(data);

  const safeFallbackBalance = Number.isFinite(fallbackBalance)
    ? fallbackBalance
    : 0;

  const fallbackStartTime = startOfDay(filterStartTime);
  const fallbackEndTime = startOfDay(now);

  const flatFallback: BalancePoint[] =
    fallbackStartTime === fallbackEndTime
      ? [{ time: fallbackStartTime, balance: safeFallbackBalance }]
      : [
          { time: fallbackStartTime, balance: safeFallbackBalance },
          { time: fallbackEndTime, balance: safeFallbackBalance },
        ];

  if (sortedData.length === 0) {
    return flatFallback;
  }

  let startingBalance = 0;
  let hasUsablePoint = false;

  const balanceByDay = new Map<number, number>();

  for (const point of sortedData) {
    const safeBalance = Number.isFinite(point.balance) ? point.balance : 0;

    if (point.time < filterStartTime) {
      startingBalance = safeBalance;
      hasUsablePoint = true;
      continue;
    }

    if (point.time > now) {
      break;
    }

    balanceByDay.set(startOfDay(point.time), safeBalance);
    hasUsablePoint = true;
  }

  if (!hasUsablePoint) {
    return flatFallback;
  }

  const result: BalancePoint[] = [];
  let currentBalance = startingBalance;
  const endDay = startOfDay(now);

  for (
    let day = startOfDay(filterStartTime);
    day <= endDay;
    day = addDays(day, 1)
  ) {
    const balanceInDay = balanceByDay.get(day);

    if (typeof balanceInDay === "number") {
      currentBalance = balanceInDay;
    }

    result.push({ time: day, balance: currentBalance });
  }

  if (result.length === 0) {
    return flatFallback;
  }

  return result;
}

function getValueBounds(values: number[]): { min: number; max: number } {
  const safeValues = values.filter((value) => Number.isFinite(value));

  if (safeValues.length === 0) {
    return { min: 0, max: 1 };
  }

  let min = safeValues[0] ?? 0;
  let max = min;

  for (const value of safeValues) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  if (min === max) {
    return { min: min - 1000, max: max + 1000 };
  }

  const padding = (max - min) * 0.08;

  return {
    min: min - padding,
    max: max + padding,
  };
}

function createSmoothPath(points: Array<Pick<ChartPoint, "x" | "y">>): string {
  const firstPoint = points[0];

  if (!firstPoint) {
    return "";
  }

  if (points.length === 1) {
    return `M ${firstPoint.x}, ${firstPoint.y}`;
  }

  const segments: string[] = [`M ${firstPoint.x}, ${firstPoint.y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const p1 = points[index];
    const p2 = points[index + 1];

    if (!p1 || !p2) {
      continue;
    }

    const p0 = points[index - 1] ?? p1;
    const p3 = points[index + 2] ?? p2;

    const cp1x = round(p1.x + (p2.x - p0.x) / 6);
    const cp1y = round(p1.y + (p2.y - p0.y) / 6);
    const cp2x = round(p2.x - (p3.x - p1.x) / 6);
    const cp2y = round(p2.y - (p3.y - p1.y) / 6);

    segments.push(`C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`);
  }

  return segments.join(" ");
}

function computeChartLayout(
  chartData: BalancePoint[],
  containerWidth: number,
  minPointDistance: number,
) {
  const safeDistance = Math.max(1, minPointDistance);

  if (chartData.length === 0) {
    return {
      svgWidth: Math.max(containerWidth, safeDistance),
      points: [] as ChartPoint[],
      path: "",
      areaPath: "",
      isScrollable: false,
      pointDistance: safeDistance,
    };
  }

  const paddingX = safeDistance / 2;
  const requiredWidth = (chartData.length - 1) * safeDistance + paddingX * 2;

  const svgWidth = Math.max(containerWidth, requiredWidth);
  const usableWidth = Math.max(1, svgWidth - paddingX * 2);

  const values = chartData.map((item) => item.balance);
  const { min, max } = getValueBounds(values);
  const range = max - min || 1;

  const points: ChartPoint[] = chartData.map((item, index) => {
    const safeBalance = Number.isFinite(item.balance) ? item.balance : 0;

    const x = round(
      paddingX + (index / Math.max(1, chartData.length - 1)) * usableWidth,
    );

    const y = round(
      CHART_HEIGHT - ((safeBalance - min) / range) * CHART_HEIGHT,
    );

    return {
      x,
      y,
      time: item.time,
      balance: safeBalance,
      date: formatDate(item.time),
    };
  });

  const path = createSmoothPath(points);

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  if (!firstPoint || !lastPoint) {
    return {
      svgWidth,
      points: [] as ChartPoint[],
      path: "",
      areaPath: "",
      isScrollable: false,
      pointDistance: safeDistance,
    };
  }

  const areaPath = `${path} L ${lastPoint.x},${CHART_HEIGHT} L ${firstPoint.x},${CHART_HEIGHT} Z`;

  return {
    svgWidth,
    points,
    path,
    areaPath,
    isScrollable: svgWidth > containerWidth,
    pointDistance: safeDistance,
  };
}

export default function BalanceChart({
  data,
  color,
  daysFilter,
  showTooltip = true,
  lastBalance,
  minPointDistance = 20,
}: BalanceChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const gradientId = `balance-chart-gradient-${useId().replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  )}`;

  const [containerWidth, setContainerWidth] = useState(300);
  const [contentLeft, setContentLeft] = useState(0);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);

  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [isScrollHintVisible, setIsScrollHintVisible] = useState(false);
  const [isScrollHintLeaving, setIsScrollHintLeaving] = useState(false);

  const colorTokens = useMemo(() => {
    const accountColor = color ? AccountColors[color] : undefined;

    if (accountColor) {
      return {
        stroke: accountColor.primaryValue,
        tooltipBorder: accountColor.border,
        tooltipBackground: accountColor.surface,
        tooltipText: accountColor.text,
      };
    }

    return {
      stroke: PrimaryColors.primary.primaryValue,
      tooltipBorder: PrimaryColors.primary.box,
      tooltipBackground: "",
      tooltipText: "text-primary",
    };
  }, [color]);

  useEffect(() => {
    setHasUserScrolled(Boolean(safeGetSessionItem(SCROLL_HINT_KEY)));
  }, []);

  useEffect(() => {
    if (!showTooltip) {
      setSelectedTime(null);
    }
  }, [showTooltip]);

  useEffect(() => {
    setSelectedTime(null);
  }, [data, daysFilter, lastBalance]);

  const updateContentLeft = useCallback(() => {
    if (!innerRef.current || !wrapperRef.current) return;

    const innerRect = innerRef.current.getBoundingClientRect();
    const wrapperRect = wrapperRef.current.getBoundingClientRect();

    setContentLeft(innerRect.left - wrapperRect.left);
  }, []);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateLayout = () => {
      setContainerWidth(element.clientWidth);
      updateContentLeft();
    };

    updateLayout();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const entry = entries[0];

        if (entry) {
          setContainerWidth(Math.round(entry.contentRect.width));
        }

        updateContentLeft();
      });

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }

    window.addEventListener("resize", updateLayout);

    return () => {
      window.removeEventListener("resize", updateLayout);
    };
  }, [updateContentLeft]);

  const chartData = useMemo(() => {
    const now = Date.now();
    return buildDailySeries(data, daysFilter, lastBalance, now);
  }, [data, daysFilter, lastBalance]);

  const { points, path, areaPath, svgWidth, isScrollable, pointDistance } =
    useMemo(
      () => computeChartLayout(chartData, containerWidth, minPointDistance),
      [chartData, containerWidth, minPointDistance],
    );

  const selectedPoint = useMemo(() => {
    if (!showTooltip || selectedTime === null) return null;
    return points.find((point) => point.time === selectedTime) ?? null;
  }, [points, selectedTime, showTooltip]);

  useEffect(() => {
    updateContentLeft();
  }, [svgWidth, containerWidth, updateContentLeft]);

  const shouldShowScrollHint =
    isScrollable && daysFilter > 7 && !hasUserScrolled;

  useEffect(() => {
    if (!shouldShowScrollHint) {
      setIsScrollHintVisible(false);
      setIsScrollHintLeaving(false);
      return;
    }

    setIsScrollHintVisible(true);
    setIsScrollHintLeaving(false);

    const leaveTimer = setTimeout(() => {
      setIsScrollHintLeaving(true);
    }, HINT_LEAVE_DELAY_MS);

    const unmountTimer = setTimeout(() => {
      setIsScrollHintVisible(false);
    }, HINT_UNMOUNT_DELAY_MS);

    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(unmountTimer);
    };
  }, [shouldShowScrollHint]);

  const handleScroll = useCallback(() => {
    updateContentLeft();

    if (!hasUserScrolled) {
      setHasUserScrolled(true);
      safeSetSessionItem(SCROLL_HINT_KEY, "1");
    }
  }, [hasUserScrolled, updateContentLeft]);

  const handlePointClick = useCallback(
    (point: ChartPoint, event: ReactMouseEvent<SVGRectElement>) => {
      event.stopPropagation();

      if (!showTooltip) return;

      setSelectedTime((prev) => (prev === point.time ? null : point.time));
    },
    [showTooltip],
  );

  const handleWrapperClick = useCallback(() => {
    setSelectedTime(null);
  }, []);

  if (points.length === 0) {
    return (
      <div
        ref={wrapperRef}
        className="w-full max-w-full min-w-0 overflow-visible"
        style={{ height: CHART_HEIGHT }}
      />
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-full min-w-0 relative overflow-visible"
      onClick={handleWrapperClick}
    >
      <div
        className="overflow-x-auto scrollbar-none w-full"
        style={{ height: CHART_HEIGHT }}
        onScroll={handleScroll}
      >
        <div
          ref={innerRef}
          className="relative"
          style={{ width: svgWidth, height: CHART_HEIGHT }}
        >
          <svg
            width={svgWidth}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            overflow="visible"
            role="img"
            aria-label="نمودار موجودی"
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop
                  offset="0%"
                  stopColor={colorTokens.stroke}
                  stopOpacity={0.25}
                />
                <stop
                  offset="100%"
                  stopColor={colorTokens.stroke}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <path d={areaPath} fill={`url(#${gradientId})`} />

            <path
              d={path}
              stroke={colorTokens.stroke}
              strokeWidth={2.5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point) => {
              const isSelected = selectedTime === point.time;

              return (
                <g key={point.time}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={isSelected ? 5 : 4}
                    fill={colorTokens.stroke}
                    stroke="#ffffff"
                    strokeWidth={isSelected ? 2.5 : 2}
                  />

                  <rect
                    x={point.x - pointDistance / 2}
                    y={0}
                    width={pointDistance}
                    height={CHART_HEIGHT}
                    fill="transparent"
                    className={showTooltip ? "cursor-pointer" : undefined}
                    style={{ touchAction: "manipulation" }}
                    onClick={(event) => handlePointClick(point, event)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {shouldShowScrollHint && isScrollHintVisible && (
        <div
          className={`
            absolute bottom-4 start-4 z-10 pointer-events-none
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shadow-md
            backdrop-blur-sm text-xs whitespace-nowrap
            transition-opacity duration-500 ease-out
            ${colorTokens.tooltipText}
            ${colorTokens.tooltipBackground}
            ${colorTokens.tooltipBorder}
            ${isScrollHintLeaving ? "opacity-0" : "opacity-100"}
          `}
        >
          <span>اسکرول کنید</span>
          <span className="text-sm leading-none">←</span>
        </div>
      )}

      {showTooltip && selectedPoint && (
        <div
          className={`
            absolute z-50 flex flex-col items-center gap-2 border p-2 text-xs
            shadow-md backdrop-blur-sm whitespace-nowrap pointer-events-none rounded-2xl
            ${colorTokens.tooltipBackground}
            ${colorTokens.tooltipBorder}
            ${colorTokens.tooltipText}
          `}
          style={{
            left: contentLeft + selectedPoint.x,
            top: selectedPoint.y - 48,
            transform: "translateX(-50%)",
          }}
        >
          <span>{formatNumber(selectedPoint.balance)} ﷼</span>
          <span className="text-secondary">{selectedPoint.date}</span>
        </div>
      )}
    </div>
  );
}
