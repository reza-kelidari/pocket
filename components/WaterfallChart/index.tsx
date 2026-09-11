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

type WaterfallChartProps = {
  data: WaterfallData;
  color?: keyof typeof AccountColors;
};

const CHART_HEIGHT = 280;
const TOP_PADDING = 40;
const BOTTOM_PADDING = 36;
const SIDE_PADDING = 12;
const BAR_GAP_RATIO = 0.3;
const TOTAL_COLUMN_RATIO = 1.2;

const INCOME_COLOR = "#009764";
const EXPENSE_COLOR = "#a40000";
const PRIMARY_COLOR = "#4394b3";
const CONNECTOR_COLOR = "#7b7b7b40";
const GRID_COLOR = "#7b7b7b1a";
const LABEL_COLOR = "#7b7b7b";

const TOOLTIP_WIDTH = 84;
const TOOLTIP_HEIGHT = 22;
const TOTAL_TOOLTIP_WIDTH = 96;

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

function formatFull(value: number): string {
  const abs = Math.abs(value).toLocaleString("fa-IR");
  if (value > 0) return `${abs} +`;
  if (value < 0) return `${abs} -`;
  return abs;
}

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

export default function WaterfallChart({ data, color }: WaterfallChartProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(350);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/[^a-zA-Z0-9_-]/g, "");

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

  const chartLayout = useMemo(() => {
    const { months, total } = data;
    const drawHeight = CHART_HEIGHT - TOP_PADDING - BOTTOM_PADDING;

    const allLevels: number[] = [0];
    for (const m of months) {
      allLevels.push(m.startLevel);
      allLevels.push(m.endLevel);
    }
    allLevels.push(total);

    const rawMin = Math.min(...allLevels);
    const rawMax = Math.max(...allLevels);
    const range = rawMax - rawMin || 1;
    const padding = range * 0.12;
    const minVal = rawMin - padding;
    const maxVal = rawMax + padding;
    const valueRange = maxVal - minVal;

    const totalColumns = 12 + TOTAL_COLUMN_RATIO;
    const availableWidth = containerWidth - SIDE_PADDING * 2;
    const columnWidth =
      availableWidth / (totalColumns + totalColumns * BAR_GAP_RATIO);
    const barWidth = columnWidth;
    const gap = columnWidth * BAR_GAP_RATIO;

    const valueToY = (value: number): number => {
      return TOP_PADDING + drawHeight * (1 - (value - minVal) / valueRange);
    };

    const zeroY = valueToY(0);

    const bars = months.map((m, i) => {
      const x = SIDE_PADDING + i * (barWidth + gap);
      const y1 = valueToY(m.startLevel);
      const y2 = valueToY(m.endLevel);
      const barTop = Math.min(y1, y2);
      const barBottom = Math.max(y1, y2);
      const barHeight = Math.max(barBottom - barTop, 1);

      return {
        ...m,
        index: i,
        x,
        y1,
        y2,
        barTop,
        barBottom,
        barHeight,
        centerX: x + barWidth / 2,
        fill: m.isPositive ? INCOME_COLOR : EXPENSE_COLOR,
      };
    });

    const totalX = SIDE_PADDING + 12 * (barWidth + gap) + gap * 0.5;
    const totalBarWidth = barWidth * TOTAL_COLUMN_RATIO;
    const totalY1 = zeroY;
    const totalY2 = valueToY(total);
    const totalBarTop = Math.min(totalY1, totalY2);
    const totalBarBottom = Math.max(totalY1, totalY2);
    const totalBarHeight = Math.max(totalBarBottom - totalBarTop, 1);
    const totalFill = data.totalIsPositive ? PRIMARY_COLOR : EXPENSE_COLOR;

    const connectors = bars.slice(0, -1).map((bar, i) => {
      const nextBar = bars[i + 1];
      return {
        x1: bar.x + barWidth,
        y1: bar.y2,
        x2: nextBar.x,
        y2: nextBar.y1,
      };
    });

    const lastBar = bars[bars.length - 1];

    const totalConnector = {
      x1: lastBar.x + barWidth,
      y1: lastBar.y2,
      x2: totalX,
      y2: totalY2,
    };

    const originConnector = {
      x1: bars[0]?.x ?? SIDE_PADDING,
      y1: zeroY,
      x2: totalX,
      y2: zeroY,
    };

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

  const handleBarHover = useCallback((index: number | null) => {
    setHoveredIndex(index);
  }, []);

  const activeTooltip = useMemo(() => {
    if (hoveredIndex === null) return null;

    if (hoveredIndex === 12) {
      const x = clampTooltipX(
        chartLayout.totalX + chartLayout.totalBarWidth / 2,
        TOTAL_TOOLTIP_WIDTH,
        containerWidth,
      );
      const width = TOTAL_TOOLTIP_WIDTH;
      const y = Math.max(chartLayout.totalBarTop - TOOLTIP_HEIGHT - 6, 2);
      const textX = x + width / 2;
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
    <div ref={wrapperRef} className="w-full relative overflow-hidden" dir="ltr">
      <svg
        width={containerWidth}
        height={CHART_HEIGHT}
        viewBox={`0 0 ${containerWidth} ${CHART_HEIGHT}`}
        className="block"
      >
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

        <line
          x1={chartLayout.totalConnector.x1}
          y1={chartLayout.totalConnector.y1}
          x2={chartLayout.totalConnector.x2}
          y2={chartLayout.totalConnector.y2}
          stroke={CONNECTOR_COLOR}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        <line
          x1={chartLayout.originConnector.x1}
          y1={chartLayout.originConnector.y1}
          x2={chartLayout.originConnector.x2}
          y2={chartLayout.originConnector.y2}
          stroke={CONNECTOR_COLOR}
          strokeWidth={1.5}
          strokeDasharray="3 3"
        />

        {chartLayout.bars.map((bar) => {
          const isHovered = hoveredIndex === bar.index;
          const isCurrent = bar.isCurrentMonth;

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

              <rect
                x={bar.x}
                y={bar.barTop}
                width={chartLayout.barWidth}
                height={bar.barHeight}
                rx={3}
                ry={3}
                fill={bar.fill}
                opacity={isHovered ? 1 : isCurrent ? 0.95 : 0.85}
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
              >
                {bar.name}
              </text>
            </g>
          );
        })}

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

        <text
          x={chartLayout.totalX + chartLayout.totalBarWidth / 2}
          y={CHART_HEIGHT - 2}
          textAnchor="middle"
          fontSize={8}
          fill={LABEL_COLOR}
        >
          {formatCompact(data.total)}
        </text>

        {activeTooltip && (
          <g style={{ pointerEvents: "none" }}>
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
    </div>
  );
}
