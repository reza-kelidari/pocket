/**
 * @fileoverview Time-Series Forecasting Utilities
 *
 * Provides four forecasting algorithms used by the analyze screen to
 * project future income/expense trends from a historical series:
 *
 * - **SMA** — Simple Moving Average, the unweighted mean of the last
 *   `window` observations.
 * - **EMA** — Exponential Moving Average, which weights recent
 *   observations more heavily via a smoothing factor `alpha`.
 * - **WMA** — Weighted Moving Average, where the most recent
 *   observation gets the highest weight and the oldest the lowest.
 * - **Linear** — Ordinary least-squares linear regression, whose
 *   fitted line is extrapolated forward along the observed trend.
 *
 * ### Series shape matters — three regimes
 *
 * The four methods above only make sense for one shape of series:
 * **dense**, where most buckets carry a small amount and no single
 * bucket dominates. That is the natural shape of expenses (many small
 * payments spread across the calendar), and the algorithms work well
 * there.
 *
 * Personal finance also produces two other shapes that the same
 * algorithms cannot handle **directly on the raw per-bucket series**:
 *
 * - **Event-driven** (`density < 0.7`) — a minority of buckets carry
 *   the entire signal. Typical of income, where a salary is recorded
 *   once a month and most weeks are zero. Moving averages on the raw
 *   series either miss the spike entirely (short windows) or dilute it
 *   into insignificance (long windows), and linear regression on a
 *   mostly-zero series has near-zero slope.
 *
 * - **Semi-dense** (`0.5 ≤ density < 0.7`) — a middle ground where most
 *   buckets have some activity, but enough are zero that a sliding
 *   window can land entirely inside a lull.
 *
 * ### Non-dense series: extract signal from non-zero events
 *
 * For non-dense series, {@link forecastSeries} does **not** collapse
 * all four methods to the mean rate. Instead, it extracts the non-zero
 * values (the "events"), runs the selected method on **those**, and
 * converts the per-event prediction back to a per-bucket prediction
 * using the series' density:
 *
 * ```
 * per_bucket = per_event_prediction × density
 * ```
 *
 * This produces **distinct outputs for each method** even on sparse
 * series:
 *
 * - **SMA / EMA / WMA** — flat per-bucket predictions whose level
 *   reflects the method's weighting of recent events. SMA averages
 *   recent events equally; EMA weights the most recent event more
 *   heavily; WMA applies linear weights.
 *
 * - **Linear** — a trending per-bucket prediction that extrapolates
 *   the trend in event amounts. If a salary has been increasing by
 *   200K per payment, the forecast's per-bucket value increases
 *   over the horizon, producing a curved cumulative line (vs. the
 *   flat lines from moving averages).
 *
 * When there's no trend (e.g., a constant salary), all four methods
 * converge to the mean rate — which is the statistically correct
 * output for a stationary series.
 *
 * Fallback: if the series has fewer than 2 non-zero events, the
 * method cannot extract any signal, and the mean rate is returned.
 *
 * ### Safeguard: two-sided total-based fallback
 *
 * After computing the method's raw forecast (on both dense and
 * non-dense paths), its total is compared against the mean-rate
 * projection:
 *
 * - If the raw total is **less than** {@link METHOD_TOTAL_MIN_RATIO}
 *   of the mean-rate projection → under-forecast, fall back to mean
 *   rate. Exception: linear regression with a **negative slope** is
 *   allowed to under-forecast (a downward trend is legitimate).
 *
 * - If the raw total is **more than** {@link METHOD_TOTAL_MAX_RATIO}
 *   of the mean-rate projection → over-forecast (runaway
 *   extrapolation), fall back to mean rate.
 *
 * Both safeguards only affect the **forecast**; the caller's original
 * series is never mutated.
 *
 * ### Recursive vs. fit-once (dense series only)
 *
 * For **dense** series that reach the moving-average methods, the
 * averages are applied **recursively**: each prediction is appended to
 * a working copy of the series before the next one is computed.
 *
 * For **non-dense** series, the moving averages are applied **once**
 * on the non-zero values to get a single per-event prediction, which
 * is then projected flat across the horizon. This is correct because
 * the per-bucket prediction is `per_event × density` — a constant
 * unless the event amount itself is trending.
 *
 * Linear regression is always applied **fit-once**: the line is fitted
 * exactly once on the observed data, then evaluated at successive
 * future indices.
 *
 * ### Outlier handling (dense series only)
 *
 * Dense series are passed through {@link winsorizeOutliers} before the
 * model is fitted. Non-dense series skip winsorization — capping their
 * spikes would erase the very signal we are projecting.
 *
 * @module utility/shared/forecastMethods
 */

export const FORECAST_METHODS = [
  { value: "sma", label: "میانگین متحرک ساده" },
  { value: "ema", label: "میانگین متحرک نمایی" },
  { value: "linear", label: "رگرسیون خطی" },
  { value: "wma", label: "میانگین متحرک وزنی" },
] as const;

export type ForecastMethod = (typeof FORECAST_METHODS)[number]["value"];

export const FORECAST_METHOD_VALUES: ForecastMethod[] = [
  "sma",
  "ema",
  "linear",
  "wma",
];

/* ─────────────────────────────────────────────────────────────
 * Density + outlier handling
 * ───────────────────────────────────────────────────────────── */

const DENSE_SERIES_MIN_DENSITY = 0.7;
const METHOD_TOTAL_MIN_RATIO = 0.7;
const METHOD_TOTAL_MAX_RATIO = 3;

function computeDensity(values: number[]): number {
  if (values.length === 0) return 0;
  let nonzero = 0;
  for (const v of values) {
    if (v > 0) nonzero++;
  }
  return nonzero / values.length;
}

/**
 * Winsorizes a dense series using a robust MAD rule, and leaves
 * non-dense series untouched.
 */
export function winsorizeOutliers(values: number[], k: number = 3): number[] {
  if (values.length < 4) return [...values];
  if (computeDensity(values) < DENSE_SERIES_MIN_DENSITY) return [...values];

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  const deviations = values.map((v) => Math.abs(v - median));
  const sortedDev = [...deviations].sort((a, b) => a - b);
  let mad = sortedDev[Math.floor(sortedDev.length / 2)];

  if (mad === 0) {
    mad = deviations.reduce((s, d) => s + d, 0) / values.length;
  }

  if (mad === 0) return [...values];

  const upperCap = median + k * mad;
  return values.map((v) => Math.min(v, upperCap));
}

/* ─────────────────────────────────────────────────────────────
 * Core algorithms
 * ───────────────────────────────────────────────────────────── */

export function simpleMovingAverage(values: number[], window: number): number {
  const n = Math.min(window, values.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i++) sum += values[i];
  return sum / n;
}

export function exponentialMovingAverage(
  values: number[],
  alpha: number = 0.3,
): number {
  if (values.length === 0) return 0;
  let ema = values[0];
  for (let i = 1; i < values.length; i++) {
    ema = alpha * values[i] + (1 - alpha) * ema;
  }
  return ema;
}

export function weightedMovingAverage(
  values: number[],
  window: number,
): number {
  const n = Math.min(window, values.length);
  if (n === 0) return 0;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    const w = i + 1;
    num += w * values[values.length - n + i];
    den += w;
  }
  return num / den;
}

/* ─────────────────────────────────────────────────────────────
 * Linear regression (fit-once strategy)
 * ───────────────────────────────────────────────────────────── */

export function fitLinearRegression(values: number[]): {
  slope: number;
  intercept: number;
} {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: values[n - 1] };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export function linearRegressionForecast(values: number[]): number {
  const { slope, intercept } = fitLinearRegression(values);
  return intercept + slope * values.length;
}

/* ─────────────────────────────────────────────────────────────
 * Multi-step forecasting
 * ───────────────────────────────────────────────────────────── */

/**
 * Produces `steps` future values using the selected method.
 *
 * ### Dense series (density ≥ 0.7)
 *
 * The series is winsorized, then the method is applied directly:
 * - Moving averages: recursive (each prediction appended before next)
 * - Linear: fit-once (line fitted on observed data, extrapolated)
 *
 * ### Non-dense series (density < 0.7)
 *
 * The raw per-bucket series is mostly zeros, so methods can't extract
 * signal from it directly. Instead, the **non-zero values** (events)
 * are extracted and the method runs on those:
 *
 * - **SMA / EMA / WMA**: run once on non-zero values → single per-event
 *   prediction → `per_bucket = per_event × density` (flat across
 *   horizon). Each method produces a different level because they
 *   weight recent events differently.
 *
 * - **Linear**: fit on non-zero values, then evaluate the line at
 *   successive future event indices. `per_bucket(i) = per_event(i) ×
 *   density` where `per_event(i)` trends along the fitted line. This
 *   produces a **trending** forecast (curved cumulative), visually
 *   distinct from the flat moving-average forecasts.
 *
 * If fewer than 2 non-zero events exist, the mean rate is returned
 * (can't fit any method on 0 or 1 points).
 *
 * ### Two-sided safeguard (applies to both paths)
 *
 * - Under-forecast (< 70% of mean-rate total) → fall back to mean rate.
 *   Exception: linear with negative slope (legitimate downward trend).
 * - Over-forecast (> 300% of mean-rate total) → fall back to mean rate.
 *
 * @param values - Historical observations, oldest first.
 * @param method - Which algorithm to apply.
 * @param steps - Number of future values to generate.
 * @returns A `number[]` of length `steps`.
 */
export function forecastSeries(
  values: number[],
  method: ForecastMethod,
  steps: number,
): number[] {
  if (values.length === 0 || steps <= 0) return [];

  // ─── Shared diagnostic quantities ──────────────────────────
  const sum = values.reduce((s, v) => s + v, 0);
  const meanRate = sum / values.length;
  const expectedTotal = meanRate * steps;

  const meanRatePrediction = (() => {
    const r = Math.max(0, Math.round(meanRate));
    return Number.isFinite(r) ? r : 0;
  })();

  const isDense = computeDensity(values) >= DENSE_SERIES_MIN_DENSITY;

  // ═════════════════════════════════════════════════════════════
  //  Non-dense series: extract non-zero events, run method on those
  // ═════════════════════════════════════════════════════════════
  if (!isDense) {
    const nonzeroValues = values.filter((v) => v > 0);

    // Fewer than 2 events — can't fit any method, fall back to mean rate
    if (nonzeroValues.length < 2) {
      return Array.from({ length: steps }, () => meanRatePrediction);
    }

    const density = nonzeroValues.length / values.length;
    let rawForecast: number[];
    let linearSlope = 0;

    if (method === "linear") {
      // Fit on non-zero event amounts. Evaluate the line at successive
      // future event indices. By bucket i, approximately i × density
      // events have occurred, so the event index at bucket i is
      // n + i × density.
      const { slope, intercept } = fitLinearRegression(nonzeroValues);
      linearSlope = slope;
      const n = nonzeroValues.length;
      rawForecast = [];
      for (let i = 0; i < steps; i++) {
        const eventIndex = n + i * density;
        const perEvent = Math.max(0, intercept + slope * eventIndex);
        const perBucket = perEvent * density;
        const sanitized = Number.isFinite(perBucket)
          ? Math.max(0, Math.round(perBucket))
          : 0;
        rawForecast.push(sanitized);
      }
    } else {
      // Moving averages: single per-event prediction (not recursive),
      // projected flat across the horizon.
      const win = Math.min(7, Math.max(1, nonzeroValues.length));
      let perEvent: number;
      switch (method) {
        case "sma":
          perEvent = simpleMovingAverage(nonzeroValues, win);
          break;
        case "ema":
          perEvent = exponentialMovingAverage(nonzeroValues, 0.3);
          break;
        case "wma":
          perEvent = weightedMovingAverage(nonzeroValues, win);
          break;
        default:
          perEvent = meanRate / density;
      }
      const perBucket = perEvent * density;
      const sanitized = Number.isFinite(perBucket)
        ? Math.max(0, Math.round(perBucket))
        : 0;
      rawForecast = Array.from({ length: steps }, () => sanitized);
    }

    // ─── Two-sided safeguard ──────────────────────────────────
    const rawTotal = rawForecast.reduce((s, v) => s + v, 0);
    const isLegitimateDownwardTrend = method === "linear" && linearSlope < 0;

    if (expectedTotal > 0) {
      if (
        !isLegitimateDownwardTrend &&
        rawTotal < expectedTotal * METHOD_TOTAL_MIN_RATIO
      ) {
        return Array.from({ length: steps }, () => meanRatePrediction);
      }
      if (rawTotal > expectedTotal * METHOD_TOTAL_MAX_RATIO) {
        return Array.from({ length: steps }, () => meanRatePrediction);
      }
    }

    return rawForecast;
  }

  // ═════════════════════════════════════════════════════════════
  //  Dense series: winsorize, then apply the method directly
  // ═════════════════════════════════════════════════════════════
  const cleaned = winsorizeOutliers(values);

  let rawForecast: number[];
  let linearSlope = 0;

  if (method === "linear") {
    const { slope, intercept } = fitLinearRegression(cleaned);
    linearSlope = slope;
    const n = cleaned.length;
    rawForecast = [];
    for (let i = 0; i < steps; i++) {
      let next = intercept + slope * (n + i);
      if (!Number.isFinite(next) || next < 0) next = 0;
      rawForecast.push(Math.round(next));
    }
  } else {
    const working = [...cleaned];
    const win = Math.min(7, Math.max(1, working.length));
    rawForecast = [];
    for (let i = 0; i < steps; i++) {
      let next: number;
      switch (method) {
        case "sma":
          next = simpleMovingAverage(working, win);
          break;
        case "ema":
          next = exponentialMovingAverage(working, 0.3);
          break;
        case "wma":
          next = weightedMovingAverage(working, win);
          break;
        default:
          next = 0;
      }
      if (!Number.isFinite(next) || next < 0) next = 0;
      next = Math.round(next);
      rawForecast.push(next);
      working.push(next);
    }
  }

  // ─── Two-sided safeguard ──────────────────────────────────────
  const rawTotal = rawForecast.reduce((s, v) => s + v, 0);
  const isLegitimateDownwardTrend = method === "linear" && linearSlope < 0;

  if (expectedTotal > 0) {
    if (
      !isLegitimateDownwardTrend &&
      rawTotal < expectedTotal * METHOD_TOTAL_MIN_RATIO
    ) {
      return Array.from({ length: steps }, () => meanRatePrediction);
    }
    if (rawTotal > expectedTotal * METHOD_TOTAL_MAX_RATIO) {
      return Array.from({ length: steps }, () => meanRatePrediction);
    }
  }

  return rawForecast;
}
