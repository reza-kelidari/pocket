/**
 * @fileoverview Waterfall Chart Component
 *
 * A responsive SVG-based waterfall chart that visualizes monthly cumulative
 * income/expense flow over a Jalali calendar year, plus a summary column.
 *
 * The chart renders 13 columns laid out left-to-right:
 * - Columns 1–12 represent the twelve Jalali months. Each column is a
 *   "floating" bar whose vertical span encodes that month's net profit or
 *   loss relative to the running cumulative balance.
 * - Column 13 ("مجموع") represents the year-to-date total. It always starts
 *   at the zero baseline and extends to the final cumulative value.
 *
 * Visual conventions:
 * - Green bars (`#009764`) indicate a profitable month.
 * - Red bars (`#a40000`) indicate a loss-making month.
 * - The total column uses the primary blue (`#4394b3`) when the year is
 *   profitable, and red when the year ends in a net loss.
 * - Dashed connector lines link consecutive bars to convey the cumulative
 *   "flow" of the waterfall.
 * - A separate dashed line runs along the zero baseline from the first
 *   month to the total column, anchoring the visual to the break-even point.
 *
 * Interactivity:
 * - Hovering a bar (or the total column) reveals a tooltip showing the
 *   exact signed amount for that period.
 * - The current Jalali month is highlighted with a subtle outline ring.
 *
 * Responsiveness:
 * - The chart measures its container via `ResizeObserver` (with a
 *   `window.resize` fallback) and re-renders the SVG to fit the available
 *   width. All geometry is recomputed in a memoized layout pass.
 *
 * Rendering direction:
 * - The outer wrapper forces `dir="ltr"` so that month columns read
 *   left-to-right regardless of the app's global RTL direction.
 *
 * @module components/WaterfallChart
 */

"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { WaterfallData } from "@/utility/shared/waterfallMethods";
import { AccountColors } from "@/utility/shared/colors";

/**
 * Props accepted by the {@link WaterfallChart} component.
 */
type WaterfallChartProps = {
  /**
   * Pre-computed waterfall dataset for the current Jalali year.
   *
   * Contains an array of twelve monthly entries (each with start/end
   * cumulative levels and a net `value`), the year-to-date `total`,
   * and a boolean indicating whether that total is non-negative.
   */
  data: WaterfallData;

  /**
   * Optional account color key.
   *
   * Reserved for future per-account theming. The current implementation
   * uses fixed semantic colors (income green / expense red / primary blue)
   * and does not yet consume this prop, but it is kept in the public API
   * so callers can pass it without a breaking change later.
   */
  color?: keyof typeof AccountColors;
};

/* ─────────────────────────────────────────────────────────────────────────
 * Layout constants
 * ────────────────────────────────────────────────────────────────────────── */

/** Total SVG canvas height in pixels. */
const CHART_HEIGHT = 280;

/** Vertical padding (px) above the plot area, reserved for tooltips. */
const TOP_PADDING = 40;

/** Vertical padding (px) below the plot area, reserved for month labels. */
const BOTTOM_PADDING = 36;

/** Horizontal padding (px) on each side of the plot area. */
const SIDE_PADDING = 12;

/**
 * Ratio of the inter-bar gap to the bar width.
 *
 * A value of `0.3` means the gap between two adjacent bars equals 30 % of
 * a single bar's width.
 */
const BAR_GAP_RATIO = 0.3;

/**
 * Width multiplier for the summary ("مجموع") column.
 *
 * The total column is rendered 20 % wider than a regular month column to
 * give it visual prominence.
 */
const TOTAL_COLUMN_RATIO = 1.2;

/* ─────────────────────────────────────────────────────────────────────────
 * Color palette
 * ────────────────────────────────────────────────────────────────────────── */

/** Fill color for profitable month bars (income green). */
const INCOME_COLOR = "#009764";

/** Fill color for loss-making month bars and a loss-making year total. */
const EXPENSE_COLOR = "#a40000";

/** Fill color for the total column when the year is profitable. */
const PRIMARY_COLOR = "#4394b3";

/** Stroke color for dashed connector lines between bars. Includes alpha. */
const CONNECTOR_COLOR = "#7b7b7b40";

/** Stroke color for horizontal grid lines. Includes alpha. */
const GRID_COLOR = "#7b7b7b1a";

/** Fill color for axis labels and the compact total annotation. */
const LABEL_COLOR = "#7b7b7b";

/* ─────────────────────────────────────────────────────────────────────────
 * Tooltip geometry
 * ────────────────────────────────────────────────────────────────────────── */

/** Width (px) of the tooltip shown over a regular month bar. */
const TOOLTIP_WIDTH = 84;

/** Height (px) of every tooltip box. */
const TOOLTIP_HEIGHT = 22;

/** Width (px) of the tooltip shown over the total column. Slightly wider
 *  to accommodate potentially longer formatted numbers. */
const TOTAL_TOOLTIP_WIDTH = 96;

/* ─────────────────────────────────────────────────────────────────────────
 * Formatting helpers
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Formats a numeric value into a compact, human-readable string suitable
 * for tight spaces (e.g. the small annotation under the total column).
 *
 * Magnitude thresholds:
 * | Absolute value     | Output example |
 * |--------------------|----------------|
 * | ≥ 1 000 000 000    | `"1.5B"`       |
 * | ≥ 1 000 000        | `"3.2M"`       |
 * | ≥ 1 000            | `"42.7K"`      |
 * | < 1 000            | `"۹۵۰"` (fa-IR)|
 *
 * Trailing `.0` is stripped so `"2.0M"` renders as `"2M"`.
 * Values below 1 000 are formatted with Persian digits via
 * `toLocaleString("fa-IR")`.
 *
 * @param value - The numeric value to format. May be negative.
 * @returns A compact display string.
 */
function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return value.toLocaleString("fa-IR");
}

/**
 * Formats a signed numeric value into a full display string with an
 * explicit trailing sign, intended for tooltip labels.
 *
 * The sign is appended **after** the number (not prepended) to match the
 * Persian RTL reading convention used elsewhere in the application:
 *
 * | Input   | Output                |
 * |---------|-----------------------|
 * | `1200`  | `"۱٬۲۰۰ +"`           |
 * | `-850`  | `"۸۵۰ -"`             |
 * | `0`     | `"۰"` (no sign)       |
 *
 * The numeric portion is always formatted with Persian digits and
 * thousands separators via `toLocaleString("fa-IR")`.
 *
 * @param value - The numeric value to format.
 * @returns A display string with Persian digits and an explicit sign.
 */
function formatFull(value: number): string {
  const abs = Math.abs(value).toLocaleString("fa-IR");
  if (value > 0) return `${abs} +`;
  if (value < 0) return `${abs} -`;
  return abs;
}

/**
 * Clamps the horizontal position of a tooltip so that it remains fully
 * visible within the chart container.
 *
 * The tooltip is centered on `centerX` by default. If centering would
 * cause the tooltip to overflow the left or right edge (accounting for
 * {@link SIDE_PADDING}), the position is shifted inward.
 *
 * @param centerX        - Desired horizontal center of the tooltip (SVG coords).
 * @param width          - Width of the tooltip box in pixels.
 * @param containerWidth - Current pixel width of the chart container.
 * @returns The clamped left-edge x-coordinate for the tooltip `<rect>`.
 */
function clampTooltipX(
  centerX: number,
  width: number,
  containerWidth: number,
): number {
  let x = centerX - width / 2;
  if (x < SIDE_PADDING) x = SIDE_PADDING;
  if (x + width > containerWidth - SIDE_PADDING) {
    x = containerWidth - SIDE_PADDING - width;
  }
  return x;
}

/**
 * `WaterfallChart` — renders a monthly income/expense waterfall chart as an
 * inline SVG.
 *
 * ## Rendering pipeline
 *
 * 1. **Container measurement** — A `ResizeObserver` (or `window.resize`
 *    fallback) tracks the wrapper's `clientWidth` and stores it in state.
 *
 * 2. **Layout computation** (`chartLayout` memo) — Given the container
 *    width and the `data` prop, this memo computes:
 *    - The value-to-pixel mapping (`valueToY`) derived from the data's
 *      min/max cumulative levels with 12 % vertical padding.
 *    - Geometry for each of the 12 month bars (x, y, width, height).
 *    - Geometry for the total column.
 *    - Connector line segments between consecutive bars and from the last
 *      bar to the total column.
 *    - A zero-baseline connector from the first bar to the total column.
 *    - Horizontal grid lines at evenly spaced value intervals.
 *
 * 3. **Tooltip computation** (`activeTooltip` memo) — When `hoveredIndex`
 *    is set, computes the tooltip box position and label text for either a
 *    month bar (indices 0–11) or the total column (index 12).
 *
 * 4. **SVG output** — Grid lines → connectors → month bars → total column
 *    → labels → tooltip. The tooltip is rendered last so it always appears
 *    on top.
 *
 * ## Column index convention
 *
 * | Index | Meaning                |
 * |-------|------------------------|
 * | 0–11  | Jalali months 1–12     |
 * | 12    | Year-to-date total     |
 *
 * ## Accessibility notes
 *
 * - The wrapper sets `dir="ltr"` so columns always read left-to-right.
 * - Hover hit-areas are enlarged with a transparent `<rect>` per bar to
 *   improve touch/mouse targeting.
 * - The unit annotation ("واحد: ریال") is marked `pointer-events-none`
 *   to stay out of the interaction layer.
 *
 * @param props - Component props. See {@link WaterfallChartProps}.
 * @returns A responsive, interactive SVG waterfall chart.
 *
 * @example
 * ```tsx
 * import WaterfallChart from "@/components/WaterfallChart";
 * import { calculateWaterfallData } from "@/utility/shared/waterfallMethods";
 *
 * const data = calculateWaterfallData(transactions);
 * return <WaterfallChart data={data} />;
 * ```
 */
export default function WaterfallChart({ data, color }: WaterfallChartProps) {
  /** Ref to the outer wrapper `<div>`, used for width measurement. */
  const wrapperRef = useRef<HTMLDivElement>(null);

  /**
   * Current pixel width of the chart container.
   * Updated by the ResizeObserver effect. Defaults to 350 as a reasonable
   * initial guess before the first measurement lands.
   */
  const [containerWidth, setContainerWidth] = useState(350);

  /**
   * Index of the currently hovered column, or `null` when nothing is
   * hovered.
   *
   * - `0`–`11` → a month bar.
   * - `12`     → the total column.
   */
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  /**
   * Stable, unique identifier used to scope SVG `<defs>` (e.g. gradients)
   * if they are added in the future. Colons injected by React's `useId`
   * are stripped because they are invalid inside SVG `url(#…)` references.
   */
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

  /**
   * Measures the wrapper element's width and keeps it in sync with state.
   *
   * Strategy:
   * 1. Perform an immediate synchronous measurement on mount.
   * 2. If `ResizeObserver` is available, observe the wrapper for
   *    continuous, layout-driven updates.
   * 3. Otherwise, fall back to a `window.resize` listener.
   *
   * Cleanup disconnects the observer or removes the listener on unmount.
   */
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) return;

    const updateLayout = () => {
      setContainerWidth(element.clientWidth);
    };

    updateLayout();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setContainerWidth(Math.round(entries[0].contentRect.width));
        }
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  /**
   * Core layout computation.
   *
   * Recomputes all chart geometry whenever `data` or `containerWidth`
   * changes. The returned object contains everything the render pass needs:
   * bar rectangles, connector segments, grid lines, the value-to-pixel
   * mapper, and the total column geometry.
   *
   * ### Value axis
   *
   * The vertical scale is derived from the union of:
   * - The zero baseline.
   * - Every month's `startLevel` and `endLevel`.
   * - The year `total`.
   *
   * A 12 % padding is added above and below the raw range so bars never
   * touch the SVG edges.
   *
   * ### Horizontal layout
   *
   * The available width (container minus side padding) is divided into
   * `12 + TOTAL_COLUMN_RATIO` logical columns plus proportional gaps.
   * Each month bar occupies one logical column; the total column occupies
   * `TOTAL_COLUMN_RATIO` logical columns.
   *
   * @returns An object describing all drawable geometry for the current
   *          data and container size.
   */
  const chartLayout = useMemo(() => {
    const { months, total } = data;

    /** Pixel height of the drawable plot area (excluding top/bottom padding). */
    const drawHeight = CHART_HEIGHT - TOP_PADDING - BOTTOM_PADDING;

    /* ── Determine value range ─────────────────────────────────────── */

    /**
     * Collects every value the vertical axis must accommodate.
     * Includes the zero baseline so the axis always crosses zero.
     */
    const allLevels: number[] = [0];
    for (const m of months) {
      allLevels.push(m.startLevel);
      allLevels.push(m.endLevel);
    }
    allLevels.push(total);

    const rawMin = Math.min(...allLevels);
    const rawMax = Math.max(...allLevels);
    /** Raw span; falls back to `1` to avoid division-by-zero on flat data. */
    const range = rawMax - rawMin || 1;
    /** Symmetric padding applied above and below the raw range. */
    const padding = range * 0.12;
    const minVal = rawMin - padding;
    const maxVal = rawMax + padding;
    /** Total padded value span used by `valueToY`. */
    const valueRange = maxVal - minVal;

    /* ── Horizontal sizing ─────────────────────────────────────────── */

    /** Total logical column count: 12 months + the wider total column. */
    const totalColumns = 12 + TOTAL_COLUMN_RATIO;
    /** Pixel width available after subtracting horizontal padding. */
    const availableWidth = containerWidth - SIDE_PADDING * 2;
    /**
     * Base column width in pixels. Gaps are allocated proportionally via
     * {@link BAR_GAP_RATIO}, so the denominator includes both columns and
     * their proportional gap share.
     */
    const columnWidth =
      availableWidth / (totalColumns + totalColumns * BAR_GAP_RATIO);
    /** Alias for clarity: each month bar is exactly one column wide. */
    const barWidth = columnWidth;
    /** Pixel width of the gap between adjacent bars. */
    const gap = columnWidth * BAR_GAP_RATIO;

    /* ── Value-to-pixel mapping ────────────────────────────────────── */

    /**
     * Maps a data value to an SVG y-coordinate.
     *
     * SVG y-coordinates increase downward, so the formula inverts the
     * normalized value: higher values produce smaller y (closer to the
     * top of the SVG).
     *
     * @param value - A data-space value within `[minVal, maxVal]`.
     * @returns The corresponding SVG y-coordinate.
     */
    const valueToY = (value: number): number => {
      return TOP_PADDING + drawHeight * (1 - (value - minVal) / valueRange);
    };

    /** SVG y-coordinate of the zero baseline. */
    const zeroY = valueToY(0);

    /* ── Month bars ────────────────────────────────────────────────── */

    /**
     * Computes geometry for each of the 12 month bars.
     *
     * Each bar is a "floating" rectangle whose top and bottom edges are
     * determined by the month's cumulative `startLevel` and `endLevel`.
     * A minimum height of 1 px is enforced so zero-value months remain
     * visible as a thin line.
     */
    const bars = months.map((m, i) => {
      /** Left edge x-coordinate. */
      const x = SIDE_PADDING + i * (barWidth + gap);
      /** SVG y of the cumulative level at the start of the month. */
      const y1 = valueToY(m.startLevel);
      /** SVG y of the cumulative level at the end of the month. */
      const y2 = valueToY(m.endLevel);
      /** Top edge (smaller y) of the bar rectangle. */
      const barTop = Math.min(y1, y2);
      /** Bottom edge (larger y) of the bar rectangle. */
      const barBottom = Math.max(y1, y2);
      /** Pixel height, clamped to at least 1 px. */
      const barHeight = Math.max(barBottom - barTop, 1);

      return {
        ...m,
        /** Zero-based month index (0 = first month). */
        index: i,
        x,
        y1,
        y2,
        barTop,
        barBottom,
        barHeight,
        /** Horizontal center of the bar, used for labels and tooltips. */
        centerX: x + barWidth / 2,
        /** Fill color: green for profit, red for loss. */
        fill: m.isPositive ? INCOME_COLOR : EXPENSE_COLOR,
      };
    });

    /* ── Total column ──────────────────────────────────────────────── */

    /**
     * Left edge x of the total column. Placed after the 12 month bars
     * plus a half-gap for a small visual separation.
     */
    const totalX = SIDE_PADDING + 12 * (barWidth + gap) + gap * 0.5;
    /** Pixel width of the total column. */
    const totalBarWidth = barWidth * TOTAL_COLUMN_RATIO;
    /** SVG y of the zero baseline (total column always starts at zero). */
    const totalY1 = zeroY;
    /** SVG y of the year-to-date total value. */
    const totalY2 = valueToY(total);
    /** Top edge of the total column rectangle. */
    const totalBarTop = Math.min(totalY1, totalY2);
    /** Bottom edge of the total column rectangle. */
    const totalBarBottom = Math.max(totalY1, totalY2);
    /** Pixel height of the total column, clamped to at least 1 px. */
    const totalBarHeight = Math.max(totalBarBottom - totalBarTop, 1);
    /**
     * Fill color for the total column.
     * Primary blue when the year is profitable; red otherwise.
     */
    const totalFill = data.totalIsPositive ? PRIMARY_COLOR : EXPENSE_COLOR;

    /* ── Connectors ────────────────────────────────────────────────── */

    /**
     * Dashed connector segments between consecutive month bars.
     *
     * Each segment runs from the right edge of bar *i* at its end-level
     * to the left edge of bar *i + 1* at its start-level. Because a
     * month's end-level equals the next month's start-level, these
     * segments are typically horizontal, visually "carrying" the
     * cumulative balance forward.
     */
    const connectors = bars.slice(0, -1).map((bar, i) => {
      const nextBar = bars[i + 1];
      return {
        x1: bar.x + barWidth,
        y1: bar.y2,
        x2: nextBar.x,
        y2: nextBar.y1,
      };
    });

    /** Reference to the last month bar, used for the total connector. */
    const lastBar = bars[bars.length - 1];

    /**
     * Dashed connector from the last month bar's end-level to the top of
     * the total column. This visually links the monthly flow to the
     * year-to-date summary.
     */
    const totalConnector = {
      x1: lastBar.x + barWidth,
      y1: lastBar.y2,
      x2: totalX,
      y2: totalY2,
    };

    /**
     * Dashed connector along the zero baseline from the first month bar
     * to the total column. Anchors the waterfall to the break-even line
     * so the viewer can easily gauge how far each bar sits above or
     * below zero.
     */
    const originConnector = {
      x1: bars[0]?.x ?? SIDE_PADDING,
      y1: zeroY,
      x2: totalX,
      y2: zeroY,
    };

    /* ── Grid lines ────────────────────────────────────────────────── */

    /**
     * Horizontal grid lines at five evenly spaced value levels across
     * the padded range. The line at value `0` is rendered solid; all
     * others are rendered dashed.
     */
    const gridLines: number[] = [];
    const gridStep = valueRange / 4;
    for (let i = 0; i <= 4; i++) {
      const val = minVal + gridStep * i;
      gridLines.push(val);
    }

    return {
      bars,
      totalX,
      totalBarWidth,
      totalY1,
      totalY2,
      totalBarTop,
      totalBarBottom,
      totalBarHeight,
      totalFill,
      connectors,
      totalConnector,
      originConnector,
      barWidth,
      gap,
      valueToY,
      zeroY,
      gridLines,
      minVal,
      maxVal,
      drawHeight,
    };
  }, [data, containerWidth]);

  /**
   * Stable callback that sets the hovered column index.
   *
   * Pass `null` to clear the hover state (e.g. on `onMouseLeave`).
   * Memoized with `useCallback` so it can be used as a stable dependency
   * in child event handlers without causing unnecessary re-renders.
   *
   * @param index - Column index to hover (0–12), or `null` to clear.
   */
  const handleBarHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  /**
   * Computes the active tooltip's position, dimensions, color, and label
   * text based on the currently hovered column.
   *
   * Returns `null` when no column is hovered.
   *
   * ### Positioning rules
   *
   * - The tooltip is horizontally centered on the hovered bar/column,
   *   clamped to stay within the container (see {@link clampTooltipX}).
   * - Vertically it sits above the bar's top edge with a 6 px gap. If
   *   that would place it above the SVG canvas, it is pushed down to a
   *   minimum y of 2 px.
   *
   * ### Label formatting
   *
   * - Month bars display the month's net `value` via {@link formatFull}.
   * - The total column displays the year-to-date `total` via
   *   {@link formatFull}.
   * - Both labels carry a trailing `"﷼"` (Rial sign).
   *
   * @returns Tooltip geometry and content, or `null` when idle.
   */
  const activeTooltip = useMemo(() => {
    if (hoveredIndex === null) return null;

    /* Total column tooltip (index 12) */
    if (hoveredIndex === 12) {
      const x = clampTooltipX(
        chartLayout.totalX + chartLayout.totalBarWidth / 2,
        TOTAL_TOOLTIP_WIDTH,
        containerWidth,
      );
      const width = TOTAL_TOOLTIP_WIDTH;
      /** Keep the tooltip at least 2 px below the SVG top edge. */
      const y = Math.max(chartLayout.totalBarTop - TOOLTIP_HEIGHT - 6, 2);
      const textX = x + width / 2;
      /** Keep the text baseline at least 14 px below the SVG top edge. */
      const textY = Math.max(chartLayout.totalBarTop - 14, 14);
      return {
        x,
        y,
        width,
        textX,
        textY,
        color: chartLayout.totalFill,
        label: `${formatFull(data.total)} ﷼`,
      };
    }

    /* Month bar tooltip (indices 0–11) */
    const bar = chartLayout.bars[hoveredIndex];
    if (!bar) return null;
    const width = TOOLTIP_WIDTH;
    const x = clampTooltipX(bar.centerX, width, containerWidth);
    const y = Math.max(bar.barTop - TOOLTIP_HEIGHT - 6, 2);
    const textX = x + width / 2;
    const textY = Math.max(bar.barTop - 14, 14);
    return {
      x,
      y,
      width,
      textX,
      textY,
      color: bar.fill,
      label: `${formatFull(bar.value)} ﷼`,
    };
  }, [hoveredIndex, chartLayout, containerWidth, data.total]);

  return (
    /**
     * Outer wrapper.
     *
     * - `ref` is attached for ResizeObserver width measurement.
     * - `dir="ltr"` forces left-to-right column ordering regardless of
     *   the app's global RTL direction.
     * - `overflow-hidden` clips any SVG content that might extend beyond
     *   the container during resize transitions.
     */
    <div ref={wrapperRef} className="w-full relative overflow-hidden" dir="ltr">
      <svg
        width={containerWidth}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${containerWidth} ${CHART_HEIGHT}`}
        className="block"
      >
        {/* ── Horizontal grid lines ─────────────────────────────────── */}
        {/* Rendered first so they appear behind all other elements.      */}
        {/* The line at value 0 is solid; all others are dashed.         */}
        {chartLayout.gridLines.map((val, i) => {
          const y = chartLayout.valueToY(val);
          return (
            <line
              key={`grid-${i}`}
              x1={SIDE_PADDING}
              y1={y}
              x2={containerWidth - SIDE_PADDING}
              y2={y}
              stroke={GRID_COLOR}
              strokeWidth={1}
              strokeDasharray={val === 0 ? "none" : "4 4"}
            />
          );
        })}

        {/* ── Month-to-month connector lines ────────────────────────── */}
        {/* Dashed segments carrying the cumulative balance from one     */}
        {/* month bar to the next.                                       */}
        {chartLayout.connectors.map((c, i) => (
          <line
            key={`conn-${i}`}
            x1={c.x1}
            y1={c.y1}
            x2={c.x2}
            y2={c.y2}
            stroke={CONNECTOR_COLOR}
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        ))}

        {/* ── Connector: last month bar → total column ──────────────── */}
        {/* Links the end of the monthly flow to the year-to-date bar.   */}
        <line
          x1={chartLayout.totalConnector.x1}
          y1={chartLayout.totalConnector.y1}
          x2={chartLayout.totalConnector.x2}
          y2={chartLayout.totalConnector.y2}
          stroke={CONNECTOR_COLOR}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {/* ── Zero-baseline connector: first bar → total column ─────── */}
        {/* Anchors the waterfall to the break-even (zero) line.         */}
        <line
          x1={chartLayout.originConnector.x1}
          y1={chartLayout.originConnector.y1}
          x2={chartLayout.originConnector.x2}
          y2={chartLayout.originConnector.y2}
          stroke={CONNECTOR_COLOR}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {/* ── Month bars (indices 0–11) ─────────────────────────────── */}
        {chartLayout.bars.map((bar) => {
          const isHovered = hoveredIndex === bar.index;
          const isCurrent = bar.isCurrentMonth;
          const isForecast = !!bar.isForecast;

          return (
            <g
              key={`bar-${bar.index}`}
              onMouseEnter={() => handleBarHover(bar.index)}
              onMouseLeave={() => handleBarHover(null)}
              className="cursor-pointer"
            >
              <rect
                x={bar.x - 4}
                y={TOP_PADDING}
                width={chartLayout.barWidth + 8}
                height={chartLayout.drawHeight}
                fill="transparent"
              />

              {/*
        Visible bar.
        - Historical columns use the standard fill with the usual opacity.
        - Forecast columns are drawn with a semi-transparent fill and a
          dashed outline so they read as projections rather than as
          observed data.
      */}
              <rect
                x={bar.x}
                y={bar.barTop}
                width={chartLayout.barWidth}
                height={bar.barHeight}
                rx={3}
                ry={3}
                fill={bar.fill}
                opacity={
                  isHovered ? 1 : isForecast ? 0.35 : isCurrent ? 0.95 : 0.85
                }
                stroke={isForecast ? bar.fill : "none"}
                strokeWidth={isForecast ? 1 : 0}
                strokeDasharray={isForecast ? "3 2" : undefined}
                className="transition-opacity duration-200"
              />

              {isCurrent && (
                <rect
                  x={bar.x - 2}
                  y={bar.barTop - 2}
                  width={chartLayout.barWidth + 4}
                  height={bar.barHeight + 4}
                  rx={5}
                  ry={5}
                  fill="none"
                  stroke={bar.fill}
                  strokeWidth={2}
                  opacity={0.4}
                />
              )}

              <text
                x={bar.centerX}
                y={CHART_HEIGHT - 12}
                textAnchor="middle"
                fontSize={9}
                fill={isCurrent ? bar.fill : LABEL_COLOR}
                fontWeight={isCurrent ? "bold" : "normal"}
                opacity={isForecast ? 0.7 : 1}
              >
                {bar.name}
              </text>
            </g>
          );
        })}

        {/* ── Total column ("مجموع") ────────────────────────────────── */}
        {/* Always starts at the zero baseline and extends to the        */}
        {/* year-to-date total.                                          */}
        <rect
          x={chartLayout.totalX}
          y={chartLayout.totalBarTop}
          width={chartLayout.totalBarWidth}
          height={chartLayout.totalBarHeight}
          rx={4}
          ry={4}
          fill={chartLayout.totalFill}
          opacity={hoveredIndex === 12 ? 1 : 0.9}
          className="transition-opacity duration-200 cursor-pointer"
          onMouseEnter={() => handleBarHover(12)}
          onMouseLeave={() => handleBarHover(null)}
        />

        {/* "مجموع" label below the total column. */}
        <text
          x={chartLayout.totalX + chartLayout.totalBarWidth / 2}
          y={CHART_HEIGHT - 12}
          textAnchor="middle"
          fontSize={9}
          fill={chartLayout.totalFill}
          fontWeight="bold"
        >
          مجموع
        </text>

        {/* Compact numeric annotation below the "مجموع" label. */}
        <text
          x={chartLayout.totalX + chartLayout.totalBarWidth / 2}
          y={CHART_HEIGHT - 2}
          textAnchor="middle"
          fontSize={8}
          fill={LABEL_COLOR}
        >
          {formatCompact(data.total)}
        </text>

        {/* ── Tooltip ───────────────────────────────────────────────── */}
        {/* Rendered last so it always appears on top of bars and lines. */}
        {/* pointer-events is disabled to avoid interfering with hover.  */}
        {activeTooltip && (
          <g style={{ pointerEvents: "none" }}>
            {/* Tooltip background box. */}
            <rect
              x={activeTooltip.x}
              y={activeTooltip.y}
              width={activeTooltip.width}
              height={TOOLTIP_HEIGHT}
              rx={6}
              fill="white"
              stroke="#e5e5e5"
              strokeWidth={1}
              style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.05))" }}
            />
            {/*
              Tooltip label text.
              `direction="ltr"` and `unicodeBidi: "plaintext"` ensure the
              mixed digits/sign/Rial-sign string renders correctly even
              though the surrounding document is RTL.
            */}
            <text
              x={activeTooltip.textX}
              y={activeTooltip.textY}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill={activeTooltip.color}
              direction="ltr"
              style={{ unicodeBidi: "plaintext" }}
            >
              {activeTooltip.label}
            </text>
          </g>
        )}
      </svg>

      {/*
        Unit annotation displayed at the top-left of the chart.
        `dir="rtl"` is set locally so the Persian text reads correctly
        even though the wrapper is LTR.
      */}
      <div
        className="absolute top-1 left-3 text-[9px] text-secondary pointer-events-none"
        dir="rtl"
      >
        واحد: ریال
      </div>
    </div>
  );
}
