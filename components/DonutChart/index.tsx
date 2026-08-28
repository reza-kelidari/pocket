"use client";

import { useEffect, useId, useRef, useState } from "react";

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  if (endAngle - startAngle < 0.05) return "";

  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function describeRoundedDonutSlice(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
  cornerR: number,
) {
  const span = endAngle - startAngle;
  if (span < 0.05) return "";

  if (span >= 359) {
    return describeDonutSlice(
      cx,
      cy,
      outerR,
      innerR,
      startAngle,
      startAngle + 359.99,
    );
  }

  const thickness = outerR - innerR;
  const maxOff = Math.max((span - 0.5) / 2, 0);
  const maxCrByAngle = Math.min(
    (maxOff * outerR * Math.PI) / 180,
    (maxOff * innerR * Math.PI) / 180,
  );

  const cr = Math.min(
    cornerR,
    thickness / 2 - 0.15,
    (span * Math.PI * innerR) / 360,
    maxCrByAngle,
  );

  if (cr < 0.5) {
    return describeDonutSlice(cx, cy, outerR, innerR, startAngle, endAngle);
  }

  const outerOff = (cr / outerR) * (180 / Math.PI);
  const innerOff = (cr / innerR) * (180 / Math.PI);

  const os = startAngle + outerOff;
  const oe = endAngle - outerOff;
  const is_ = startAngle + innerOff;
  const ie = endAngle - innerOff;
  const largeArc = oe - os > 180 ? 1 : 0;

  const p = (r: number, a: number) => polarToCartesian(cx, cy, r, a);

  const outerArcStart = p(outerR, os);
  const outerArcEnd = p(outerR, oe);
  const innerArcEnd = p(innerR, ie);
  const innerArcStart = p(innerR, is_);

  const radialOuterEnd = p(outerR - cr, endAngle);
  const radialInnerEnd = p(innerR + cr, endAngle);
  const radialInnerStart = p(innerR + cr, startAngle);
  const radialOuterStart = p(outerR - cr, startAngle);

  return [
    `M ${radialOuterStart.x} ${radialOuterStart.y}`,
    `A ${cr} ${cr} 0 0 1 ${outerArcStart.x} ${outerArcStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerArcEnd.x} ${outerArcEnd.y}`,
    `A ${cr} ${cr} 0 0 1 ${radialOuterEnd.x} ${radialOuterEnd.y}`,
    `L ${radialInnerEnd.x} ${radialInnerEnd.y}`,
    `A ${cr} ${cr} 0 0 1 ${innerArcEnd.x} ${innerArcEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerArcStart.x} ${innerArcStart.y}`,
    `A ${cr} ${cr} 0 0 1 ${radialInnerStart.x} ${radialInnerStart.y}`,
    "Z",
  ].join(" ");
}

const GAP_DEG = 4;
const CORNER_RADIUS = 3;
const MIN_PERCENT = 0.01;
const ANIM_DURATION = 600;
const DRAW_EPS = 0.0005;

type Slice = { percent: number; color: string };

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function prepareSlices(data: Slice[]): Slice[] {
  const segments = data.filter((d) => d.percent > 0);
  if (segments.length === 0) return [];

  const adjusted = segments.map((s) => ({
    color: s.color,
    original: s.percent,
    percent: s.percent,
  }));

  let boostNeeded = 0;
  for (const s of adjusted) {
    if (s.original < MIN_PERCENT) {
      boostNeeded += MIN_PERCENT - s.original;
      s.percent = MIN_PERCENT;
    }
  }

  const donors = adjusted.filter((s) => s.original >= MIN_PERCENT);
  const donorSum = donors.reduce((sum, s) => sum + s.percent, 0);

  if (boostNeeded > 0 && donorSum > 0) {
    for (const s of donors) {
      s.percent -= boostNeeded * (s.percent / donorSum);
    }
  }

  return adjusted.map(({ color, percent }) => ({ color, percent }));
}

function interpolateSlices(from: Slice[], to: Slice[], t: number): Slice[] {
  const colors = Array.from(
    new Set([...from.map((s) => s.color), ...to.map((s) => s.color)]),
  );

  const result: Slice[] = [];
  for (const color of colors) {
    const a = from.find((s) => s.color === color)?.percent ?? 0;
    const b = to.find((s) => s.color === color)?.percent ?? 0;
    const percent = a + (b - a) * t;
    result.push({ color, percent: Math.max(0, percent) });
  }
  return result;
}

function useAnimatedSlices(data: Slice[], duration = ANIM_DURATION) {
  const target = prepareSlices(data);
  const [display, setDisplay] = useState<Slice[]>(target);
  const fromRef = useRef<Slice[]>(target);
  const rafRef = useRef(0);
  const dataKey = data.map((d) => `${d.color}:${d.percent}`).join("|");
  const prevKeyRef = useRef(dataKey);

  useEffect(() => {
    if (prevKeyRef.current === dataKey) return;
    prevKeyRef.current = dataKey;

    const from = fromRef.current;
    const to = prepareSlices(data);
    const start = performance.now();

    cancelAnimationFrame(rafRef.current);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const current = interpolateSlices(from, to, eased);
      setDisplay(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [dataKey, data, duration]);

  return display;
}

export default function DonutChart({
  data,
}: {
  data: { percent: number; color: string }[];
}) {
  const cx = 50;
  const cy = 50;
  const outerR = 43;
  const innerR = 29;

  const adjusted = useAnimatedSlices(data);

  const visible = adjusted.filter((s) => s.percent > DRAW_EPS);
  const n = visible.length;

  const totalPercent = visible.reduce((s, d) => s + d.percent, 0) || 1;
  const maxPercent = n > 0 ? Math.max(...visible.map((s) => s.percent)) : 0;
  const othersSum = totalPercent - maxPercent;
  const gapScale = n <= 1 ? 0 : Math.min(1, othersSum / 0.04);

  const totalGap = n <= 1 ? 0 : n * GAP_DEG * gapScale;
  const available = 360 - totalGap;
  const percentSum = totalPercent;

  let cursor = 0;

  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32 shrink-0">
      {visible.map((item, index) => {
        const span = (item.percent / percentSum) * available;
        const halfGap = n <= 1 ? 0 : (GAP_DEG * gapScale) / 2;
        const drawStart = cursor + halfGap;
        const drawEnd = drawStart + span;
        cursor += span + (n <= 1 ? 0 : GAP_DEG * gapScale);

        const d = describeRoundedDonutSlice(
          cx,
          cy,
          outerR,
          innerR,
          drawStart,
          drawEnd,
          CORNER_RADIUS,
        );
        if (!d) return null;

        return <path key={index} d={d} fill={item.color} />;
      })}
    </svg>
  );
}
