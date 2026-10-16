/**
 * @fileoverview Forecast Chart
 *
 * Renders a cumulative income/expense chart with two visual layers:
 * - A **solid** line/area showing the running total from the start of
 *   the selected window through "now".
 * - A **dashed** line continuing from the last historical point through
 *   the end of the forecast horizon, based on the user-selected method.
 *
 * A vertical dashed marker separates "now" from the projected region.
 *
 * The component exposes a method picker (SMA / EMA / Linear / WMA)
 * rendered through the same {@link TimeWindow} popup used elsewhere in
 * the app, so its interaction pattern matches the time-window selector.
 *
 * The wrapper is fully responsive: a `ResizeObserver` tracks the
 * container's width and the SVG re-renders to fit, matching the
 * behavior of {@link WaterfallChart}.
 *
 * @module app/analyze/components/ForecastChart
 */

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Box from "@/components/Box";
import TimeWindow from "@/components/TimeWindow";
import Left from "@/icons/Left";
import { useTimeWindow } from "@/utility/shared/useTimeWindow";
import {
  FORECAST_METHODS,
  type ForecastMethod,
} from "@/utility/shared/forecastMethods";

/** A single point on the chart: cumulative value at a given timestamp. */
type SeriesPoint = { time: number; cumulative: number };

/** Total SVG height in pixels. */
const CHART_HEIGHT = 160;

/** Horizontal padding (px) on each side of the plot area. */
const PAD_X = 4;

/** Vertical padding (px) above the plot area. */
const PAD_TOP = 12;

/** Vertical padding (px) below the plot area. */
const PAD_BOTTOM = 20;

/**
 * Renders the two-layer SVG line chart.
 *
 * The historical portion is drawn as an area + solid stroke; the
 * forecast portion is drawn as a dashed stroke continuing from the
 * last historical point. A vertical dashed line marks "now".
 *
 * @param props - See below.
 * @param props.historical - Cumulative series from window start to now.
 * @param props.forecast - Cumulative series for the selected method.
 * @param props.color - Stroke / fill color (hex string).
 * @returns The rendered SVG chart.
 */
function LineChart({
  historical,
  forecast,
  color,
}: {
  historical: SeriesPoint[];
  forecast: SeriesPoint[];
  color: string;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const gradientId = `forecast-grad-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(100, el.clientWidth));
    update();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        if (entries[0])
          setWidth(Math.max(100, Math.round(entries[0].contentRect.width)));
      });
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const layout = useMemo(() => {
    const all = [...historical, ...forecast];
    if (all.length === 0) return null;

    const minTime = all[0].time;
    const maxTime = all[all.length - 1].time;
    let maxVal = 0;
    let minVal = 0;
    for (const p of all) {
      if (p.cumulative > maxVal) maxVal = p.cumulative;
      if (p.cumulative < minVal) minVal = p.cumulative;
    }
    const timeRange = maxTime - minTime || 1;
    const valRange = maxVal - minVal || 1;
    const drawW = width - PAD_X * 2;
    const drawH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const xOf = (t: number) => PAD_X + ((t - minTime) / timeRange) * drawW;
    const yOf = (v: number) => PAD_TOP + drawH * (1 - (v - minVal) / valRange);

    const toPath = (points: SeriesPoint[]) =>
      points
        .map(
          (p, i) =>
            `${i === 0 ? "M" : "L"} ${xOf(p.time).toFixed(2)},${yOf(p.cumulative).toFixed(2)}`,
        )
        .join(" ");

    const histPath = toPath(historical);
    const forePath = toPath(forecast);

    const firstHist = historical[0];
    const lastHist = historical[historical.length - 1];
    const areaPath =
      firstHist && lastHist
        ? `${histPath} L ${xOf(lastHist.time).toFixed(2)},${CHART_HEIGHT - PAD_BOTTOM} L ${xOf(firstHist.time).toFixed(2)},${CHART_HEIGHT - PAD_BOTTOM} Z`
        : "";

    return {
      histPath,
      forePath,
      areaPath,
      nowX: lastHist ? xOf(lastHist.time) : 0,
      hasHistory: historical.length > 0,
      hasForecast: forecast.length > 0,
    };
  }, [historical, forecast, width]);

  return (
    <div ref={wrapperRef} className="w-full" style={{ height: CHART_HEIGHT }}>
      {layout ? (
        <svg
          width={width}
          height={CHART_HEIGHT}
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          role="img"
          aria-label="نمودار پیش‌بینی"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>

          {layout.hasHistory && (
            <path d={layout.areaPath} fill={`url(#${gradientId})`} />
          )}
          {layout.hasHistory && (
            <path
              d={layout.histPath}
              stroke={color}
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {layout.hasForecast && (
            <path
              d={layout.forePath}
              stroke={color}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 4"
              opacity={0.75}
            />
          )}
          {layout.hasHistory && (
            <line
              x1={layout.nowX}
              y1={PAD_TOP}
              x2={layout.nowX}
              y2={CHART_HEIGHT - PAD_BOTTOM}
              stroke="#7b7b7b55"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          )}
        </svg>
      ) : null}
    </div>
  );
}

/**
 * Props accepted by {@link ForecastChart}.
 */
export type ForecastChartProps = {
  /** Cumulative historical series (window start → now). */
  historical: SeriesPoint[];
  /** Four future series keyed by method identifier. */
  byMethod: Record<ForecastMethod, SeriesPoint[]>;
  /** Currently selected method identifier. */
  selectedMethod: ForecastMethod;
  /** Called when the user picks a different method from the picker. */
  onSelectMethod: (method: ForecastMethod) => void;
  /** Primary color used for the lines (hex string). */
  primaryColor: string;
  /** Title shown at the top of the card. */
  title: string;
};

/**
 * The public Forecast Chart widget: title + method picker + chart +
 * summary footer.
 *
 * @param props - See {@link ForecastChartProps}.
 * @returns The rendered forecast card.
 */
export default function ForecastChart({
  historical,
  byMethod,
  selectedMethod,
  onSelectMethod,
  primaryColor,
  title,
}: ForecastChartProps) {
  const tw = useTimeWindow();

  // The TimeWindow popup wants `{ name, time }` options; we use the
  // option's index as its `time` value and map back on selection.
  const methodOptions = useMemo(
    () => FORECAST_METHODS.map((m, i) => ({ name: m.label, time: i })),
    [],
  );
  const selectedIndex = Math.max(
    0,
    FORECAST_METHODS.findIndex((m) => m.value === selectedMethod),
  );
  const selectedLabel =
    FORECAST_METHODS[selectedIndex]?.label ?? "روش پیش‌بینی";

  const forecastPoints = byMethod[selectedMethod] ?? [];
  const currentCumulative = historical[historical.length - 1]?.cumulative ?? 0;
  const forecastEndCumulative =
    forecastPoints[forecastPoints.length - 1]?.cumulative ?? currentCumulative;

  return (
    <Box className="gap-4">
      {/* ─── Header: title + method picker ───────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-secondary">{title}</span>
        <div className="relative" ref={tw.dropdownRef}>
          <button
            type="button"
            onClick={tw.toggle}
            className="border border-elements-border bg-elements-background px-2.5 py-1.5 rounded-2xl text-[11px] flex items-center gap-1 text-nowrap cursor-pointer"
          >
            {selectedLabel}
            <Left height={11} width={11} className="fill-current" />
          </button>
          <TimeWindow
            isMounted={tw.isMounted}
            isVisible={tw.isVisible}
            options={methodOptions}
            onSelect={(i) => {
              onSelectMethod(FORECAST_METHODS[i].value);
              tw.close();
            }}
            activeTime={selectedIndex}
            align="left"
          />
        </div>
      </div>

      {/* ─── Legend ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4 text-[10px] text-secondary">
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5 rounded-full"
            style={{ background: primaryColor }}
          />
          <span>تاکنون</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 h-0.5 rounded-full"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${primaryColor} 0 4px, transparent 4px 8px)`,
            }}
          />
          <span>پیش‌بینی</span>
        </div>
      </div>

      {/* ─── Chart ───────────────────────────────────────────── */}
      <LineChart
        historical={historical}
        forecast={forecastPoints}
        color={primaryColor}
      />

      {/* ─── Summary footer ──────────────────────────────────── */}
      <div className="flex items-center justify-between text-[10px] text-secondary pt-2 border-t border-elements-border">
        <span>تاکنون: {currentCumulative.toLocaleString("fa-IR")} ﷼</span>
        <span>پیش‌بینی: {forecastEndCumulative.toLocaleString("fa-IR")} ﷼</span>
      </div>
    </Box>
  );
}
