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

type BalancePoint = { time: number; balance: number };
type ChartPoint = {
  x: number;
  y: number;
  time: number;
  balance: number;
  date: string;
};

interface BalanceChartProps {
  data: BalancePoint[];
  color?: AccountColorType;
  showTooltip?: boolean;
  minPointDistance?: number;
}

const CHART_HEIGHT = 140;
const CURVE = 9;
const SCROLL_HINT_KEY = "chart-scroll-hint-dismissed";
const HINT_LEAVE_DELAY_MS = 5000;
const HINT_UNMOUNT_DELAY_MS = 5500;

const dateFormatter = new Intl.DateTimeFormat("fa-IR");
const numberFormatter = new Intl.NumberFormat("fa-IR");

function round(value: number, precision = 2): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
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
  } catch {}
}

function getValueBounds(values: number[]): { min: number; max: number } {
  const safeValues = values.filter((v) => Number.isFinite(v));
  if (safeValues.length === 0) return { min: 0, max: 1 };
  let min = safeValues[0] ?? 0;
  let max = min;
  for (const v of safeValues) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return { min: min - 1000, max: max + 1000 };
  const padding = (max - min) * 0.08;
  return { min: min - padding, max: max + padding };
}

function createSmoothPath(points: Array<Pick<ChartPoint, "x" | "y">>): string {
  const firstPoint = points[0];
  if (!firstPoint) return "";
  if (points.length === 1) return `M ${firstPoint.x}, ${firstPoint.y}`;
  const segments: string[] = [`M ${firstPoint.x}, ${firstPoint.y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i],
      p2 = points[i + 1];
    if (!p1 || !p2) continue;
    const p0 = points[i - 1] ?? p1,
      p3 = points[i + 2] ?? p2;
    const cp1x = round(p1.x + (p2.x - p0.x) / CURVE);
    const cp1y = round(p1.y + (p2.y - p0.y) / CURVE);
    const cp2x = round(p2.x - (p3.x - p1.x) / CURVE);
    const cp2y = round(p2.y - (p3.y - p1.y) / CURVE);
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
  if (chartData.length === 0)
    return {
      svgWidth: Math.max(containerWidth, safeDistance),
      points: [] as ChartPoint[],
      path: "",
      areaPath: "",
      isScrollable: false,
      pointDistance: safeDistance,
    };

  const paddingX = safeDistance / 2;
  const requiredWidth = (chartData.length - 1) * safeDistance + paddingX * 2;
  const svgWidth = Math.max(containerWidth, requiredWidth);
  const usableWidth = Math.max(1, svgWidth - paddingX * 2);

  const values = chartData.map((item) => Math.abs(item.balance));
  const { min, max } = getValueBounds(values);
  const range = max - min || 1;

  const points: ChartPoint[] = chartData.map((item, index) => ({
    x: round(
      paddingX + (index / Math.max(1, chartData.length - 1)) * usableWidth,
    ),
    y: round(
      CHART_HEIGHT - ((Math.abs(item.balance) - min) / range) * CHART_HEIGHT,
    ),
    time: item.time,
    balance: item.balance,
    date: formatDate(item.time),
  }));

  const path = createSmoothPath(points);
  const firstPoint = points[0],
    lastPoint = points[points.length - 1];
  if (!firstPoint || !lastPoint)
    return {
      svgWidth,
      points: [] as ChartPoint[],
      path: "",
      areaPath: "",
      isScrollable: false,
      pointDistance: safeDistance,
    };

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
  showTooltip = true,
  minPointDistance = 20,
}: BalanceChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const gradientId = `balance-chart-gradient-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const [containerWidth, setContainerWidth] = useState(300);
  const [contentLeft, setContentLeft] = useState(0);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const [isScrollHintVisible, setIsScrollHintVisible] = useState(false);
  const [isScrollHintLeaving, setIsScrollHintLeaving] = useState(false);

  const colorTokens = useMemo(() => {
    const accountColor = color ? AccountColors[color] : undefined;
    if (accountColor)
      return {
        stroke: accountColor.primaryValue,
        tooltipBorder: accountColor.border,
        tooltipBackground: accountColor.surface,
        tooltipText: accountColor.text,
      };
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
    if (!showTooltip) setSelectedTime(null);
  }, [showTooltip]);
  useEffect(() => {
    setSelectedTime(null);
  }, [data]);

  const updateContentLeft = useCallback(() => {
    if (!innerRef.current || !wrapperRef.current) return;
    setContentLeft(
      innerRef.current.getBoundingClientRect().left -
        wrapperRef.current.getBoundingClientRect().left,
    );
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
        if (entries[0])
          setContainerWidth(Math.round(entries[0].contentRect.width));
        updateContentLeft();
      });
      observer.observe(element);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, [updateContentLeft]);

  // دیتا از قبل آماده است و نیازی به buildDailySeries نیست!
  const { points, path, areaPath, svgWidth, isScrollable, pointDistance } =
    useMemo(
      () => computeChartLayout(data, containerWidth, minPointDistance),
      [data, containerWidth, minPointDistance],
    );

  const selectedPoint = useMemo(() => {
    if (!showTooltip || selectedTime === null) return null;
    return points.find((p) => p.time === selectedTime) ?? null;
  }, [points, selectedTime, showTooltip]);

  useEffect(() => {
    updateContentLeft();
  }, [svgWidth, containerWidth, updateContentLeft]);

  // به جای daysFilter از طول آرایه دیتا استفاده می‌کنیم
  const shouldShowScrollHint =
    isScrollable && data.length > 7 && !hasUserScrolled;

  useEffect(() => {
    if (!shouldShowScrollHint) {
      setIsScrollHintVisible(false);
      setIsScrollHintLeaving(false);
      return;
    }
    setIsScrollHintVisible(true);
    setIsScrollHintLeaving(false);
    const leaveTimer = setTimeout(
      () => setIsScrollHintLeaving(true),
      HINT_LEAVE_DELAY_MS,
    );
    const unmountTimer = setTimeout(
      () => setIsScrollHintVisible(false),
      HINT_UNMOUNT_DELAY_MS,
    );
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

  if (points.length === 0)
    return (
      <div
        ref={wrapperRef}
        className="w-full max-w-full min-w-0 overflow-visible"
        style={{ height: CHART_HEIGHT }}
      />
    );

  return (
    <div
      ref={wrapperRef}
      className="w-full max-w-full min-w-0 relative overflow-visible"
      onClick={() => setSelectedTime(null)}
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
                    onClick={(e) => handlePointClick(point, e)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>
      {shouldShowScrollHint && isScrollHintVisible && (
        <div
          className={`absolute bottom-4 inset-s-4 z-10 pointer-events-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl border shadow-md backdrop-blur-sm text-xs whitespace-nowrap transition-opacity duration-500 ease-out ${colorTokens.tooltipText} ${colorTokens.tooltipBackground} ${colorTokens.tooltipBorder} ${isScrollHintLeaving ? "opacity-0" : "opacity-100"}`}
        >
          <span>اسکرول کنید</span>
          <span className="text-sm leading-none">←</span>
        </div>
      )}
      {showTooltip && selectedPoint && (
        <div
          className={`absolute z-50 flex flex-col items-center gap-2 border p-2 text-xs shadow-md backdrop-blur-sm whitespace-nowrap pointer-events-none rounded-2xl ${colorTokens.tooltipBackground} ${colorTokens.tooltipBorder} ${colorTokens.tooltipText}`}
          style={{
            left: contentLeft + selectedPoint.x,
            top: selectedPoint.y - 48,
            transform: "translateX(-50%)",
          }}
        >
          <span>{formatNumber(Math.abs(selectedPoint.balance))} ﷼</span>
          <span className="text-secondary">{selectedPoint.date}</span>
        </div>
      )}
    </div>
  );
}
