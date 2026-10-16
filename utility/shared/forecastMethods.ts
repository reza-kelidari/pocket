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
 * algorithms cannot handle:
 *
 * - **Event-driven** (`density < 0.7`) — a minority of buckets carry
 *   the entire signal. Typical of income, where a salary is recorded
 *   once a month and most weeks are zero. Moving averages either miss
 *   the spike entirely (short windows) or dilute it into insignificance
 *   (long windows), and linear regression on a mostly-zero series has
 *   near-zero slope.
 *
 * - **Semi-dense** (`0.5 ≤ density < 0.7`) — a middle ground where most
 *   buckets have some activity, but enough are zero that a sliding
 *   window can land entirely inside a lull. A moving average computed
 *   on such a window under-forecasts by an order of magnitude, because
 *   the window sees only zeros and predicts zero.
 *
 * {@link forecastSeries} treats both regimes identically: it projects
 * the historical **mean rate** flat across the horizon. For a
 * stationary event stream, the mean rate is the statistically correct
 * expectation — over N future buckets, the user is expected to receive
 * or pay `N × mean_rate`, which sums to the historical rate applied to
 * the horizon length.
 *
 * Only genuinely dense series (`density ≥ 0.7`) reach the four methods.
 * On those, the methods remain meaningfully distinct.
 *
 * ### Safeguard: total-based fallback
 *
 * Even on dense series, a method can collapse to near-zero if the most
 * recent buckets happen to be a lull. After computing the method's raw
 * forecast, its total is compared against the mean-rate projection. If
 * the raw total is less than {@link METHOD_TOTAL_MIN_RATIO} of the
 * mean-rate projection, the mean rate is returned instead. This makes
 * the forecast robust to bucket alignment and recent data quirks.
 *
 * Both safeguards only affect the **forecast**; the caller's original
 * series is never mutated, so the historical portion of the chart
 * continues to display raw values.
 *
 * ### Recursive vs. fit-once (dense series only)
 *
 * For dense series that reach the methods, the moving averages are
 * applied **recursively**: each prediction is appended to a working
 * copy of the series before the next one is computed. This is safe
 * because their sliding windows dampen any drift.
 *
 * Linear regression is applied **fit-once**: the line is fitted exactly
 * once on the observed data, then evaluated at successive future
 * indices without re-fitting. Re-fitting on an extended series is a
 * well-known failure mode — the appended predictions inflate the
 * apparent slope at every step, producing runaway growth.
 *
 * ### Outlier handling (dense series only)
 *
 * Dense series are passed through {@link winsorizeOutliers} before the
 * model is fitted. Any value above `median + k × MAD` is capped at that
 * threshold, so a single unusually large expense cannot dominate the
 * fit and tilt the projection upward for the entire horizon. Non-dense
 * series are left untouched by the winsorizer as well — capping their
 * spikes would erase the very signal we are projecting.
 *
 * The module is intentionally dependency-free and runs in both the Node
 * and browser runtimes so the same code can be reused server-side
 * (currently, forecasting is done in `/api/analyze`).
 *
 * @module utility/shared/forecastMethods
 */

/**
 * User-facing metadata for each supported forecasting method.
 *
 * `value` is the stable identifier persisted in URLs and used as the
 * key in the forecast bundle's `byMethod` record; `label` is the Persian
 * text shown in the method picker on the analyze screen.
 */
export const FORECAST_METHODS = [
  { value: "sma", label: "میانگین متحرک ساده" },
  { value: "ema", label: "میانگین متحرک نمایی" },
  { value: "linear", label: "رگرسیون خطی" },
  { value: "wma", label: "میانگین متحرک وزنی" },
] as const;

/** Discriminated union of supported forecasting method identifiers. */
export type ForecastMethod = (typeof FORECAST_METHODS)[number]["value"];

/**
 * Canonical, runtime-ordered list of every supported method.
 *
 * Iterating over this array (rather than `Object.keys`) guarantees a
 * stable order that matches {@link FORECAST_METHODS}, which is useful
 * when building the `byMethod` record returned to the client.
 */
export const FORECAST_METHOD_VALUES: ForecastMethod[] = [
  "sma",
  "ema",
  "linear",
  "wma",
];

/* ─────────────────────────────────────────────────────────────
 * Density + outlier handling
 * ───────────────────────────────────────────────────────────── */

/**
 * Minimum density (fraction of nonzero buckets) a series must have
 * before the four forecasting methods are trusted on it.
 *
 * The value `0.7` reflects a practical observation: series in the
 * `0.5–0.7` band look dense at first glance — most buckets do carry
 * some value — but they still contain enough zeros that a sliding
 * window can land entirely inside a lull, and the resulting forecast
 * collapses to near-zero. Requiring a clear majority of buckets to be
 * nonzero keeps the methods on the shape they were designed for.
 *
 * Two regimes illustrate the boundary:
 *
 * - **Weekly income from monthly salaries** — with an average of 1–2
 *   nonzero weeks per month, density lands in the `0.2–0.7` range.
 *   Skipped by the methods and handled via the mean rate.
 *
 * - **Daily expenses** — nearly every day has at least one small
 *   payment, giving density close to `1.0`. Handled by the methods.
 */
const DENSE_SERIES_MIN_DENSITY = 0.7;

/**
 * Fraction of the mean-rate projection a method's total forecast must
 * reach before the method's output is trusted as-is.
 *
 * When a method's total falls below this fraction of `mean_rate × steps`,
 * the forecast is replaced by a flat mean-rate projection. This exists
 * because a method can under-forecast by orders of magnitude when the
 * most recent buckets happen to be unusually quiet — even on series
 * dense enough to pass the density check.
 */
const METHOD_TOTAL_MIN_RATIO = 0.7;

/**
 * Computes the fraction of nonzero observations in a series.
 *
 * Density is the primary signal used to distinguish dense series from
 * event-driven and semi-dense series. Two extremes illustrate the range:
 *
 * - A dense daily expense series (small payments most days) has density
 *   close to `1.0`.
 * - A monthly salary recorded in a day-bucketed income series has
 *   density near `1/30 ≈ 0.033`.
 *
 * @param values - The series to measure.
 * @returns The fraction of values that are strictly greater than zero,
 *          in `[0, 1]`. Returns `0` for an empty series.
 */
function computeDensity(values: number[]): number {
  if (values.length === 0) return 0;
  let nonzero = 0;
  for (const v of values) {
    if (v > 0) nonzero++;
  }
  return nonzero / values.length;
}

/**
 * Winsorizes a dense series using a robust median-absolute-deviation
 * rule, and leaves non-dense series untouched.
 *
 * Any value above `median + k × MAD` is capped at that threshold. MAD
 * is preferred over the standard deviation because it is not itself
 * distorted by the outlier we are trying to contain — a property that
 * matters a lot when the whole point is to keep one extreme
 * observation from dominating the fit.
 *
 * ### Density check
 *
 * A series is considered dense when at least
 * {@link DENSE_SERIES_MIN_DENSITY} of its values are nonzero. For
 * non-dense series the `median` is often `0`, the MAD-derived cap is
 * tiny, and applying it collapses every spike by an order of magnitude.
 * Since the spikes ARE the signal for such series, winsorization is
 * skipped entirely and the series is returned unchanged.
 *
 * ### Degenerate cases
 *
 * - **Fewer than 4 observations** — the sample is too small for MAD to
 *   be meaningful; the series is returned unchanged.
 * - **Non-dense series** — see density check above.
 * - **MAD of 0** on a dense series (more than half the values equal
 *   the median) — we fall back to mean absolute deviation from the
 *   median, which is positive whenever the series has any variance.
 * - **Both MAD and mean absolute deviation of 0** — the series is
 *   constant; returned unchanged.
 *
 * ### Why cap rather than drop?
 *
 * Replacing an outlier with the cap (instead of removing it) preserves
 * the sample size and the time alignment of the series. Both matter for
 * the moving-average methods, whose windows depend on spacing being
 * uniform.
 *
 * @param values - The series to winsorize.
 * @param k - Number of MADs above the median to allow before capping.
 *            Defaults to `3`, a widely used "extreme outlier" threshold
 *            in robust statistics.
 * @returns A new array with high outliers capped. The input is not
 *          mutated.
 *
 * @example
 * ```ts
 * // Dense series with a clear outlier — the last value is capped.
 * winsorizeOutliers([100, 120, 110, 130, 115, 105, 1400]);
 * // → [100, 120, 110, 130, 115, 105, ≈260]
 *
 * // Event-driven series — returned unchanged, because the spike IS
 * // the signal.
 * winsorizeOutliers([0, 0, 0, 0, 0, 0, 5000000]);
 * // → [0, 0, 0, 0, 0, 0, 5000000]
 * ```
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
    // MAD is degenerate (more than half the values equal the median).
    // Fall back to mean absolute deviation, which is still robust
    // enough for our purpose and always positive when values vary.
    mad = deviations.reduce((s, d) => s + d, 0) / values.length;
  }

  // Series is entirely constant — nothing to cap.
  if (mad === 0) return [...values];

  const upperCap = median + k * mad;
  return values.map((v) => Math.min(v, upperCap));
}

/* ─────────────────────────────────────────────────────────────
 * Core algorithms
 * ───────────────────────────────────────────────────────────── */

/**
 * Computes the Simple Moving Average of the last `window` values.
 *
 * The window is clamped to the series length, so passing a `window`
 * larger than `values.length` simply averages the whole series. When
 * `values` is empty, returns `0` rather than `NaN`.
 *
 * @param values - Historical observations, oldest first.
 * @param window - Number of trailing observations to average.
 * @returns The unweighted mean of the trailing window, or `0` when
 *          `values` is empty.
 *
 * @example
 * ```ts
 * simpleMovingAverage([10, 20, 30, 40], 2); // → 35
 * simpleMovingAverage([], 3);              // → 0
 * ```
 */
export function simpleMovingAverage(values: number[], window: number): number {
  const n = Math.min(window, values.length);
  if (n === 0) return 0;
  let sum = 0;
  for (let i = values.length - n; i < values.length; i++) sum += values[i];
  return sum / n;
}

/**
 * Computes the Exponential Moving Average of a series.
 *
 * EMA is seeded with the first observation, then updated at each step
 * via `ema = alpha * value + (1 - alpha) * ema`. Higher `alpha` values
 * track recent changes more aggressively; the default `0.3` is a
 * reasonable compromise for noisy financial data.
 *
 * @param values - Historical observations, oldest first.
 * @param alpha - Smoothing factor in the range `(0, 1]`. Defaults to `0.3`.
 * @returns The final EMA value, or `0` when `values` is empty.
 *
 * @example
 * ```ts
 * exponentialMovingAverage([10, 20, 30]);        // smoothed toward 30
 * exponentialMovingAverage([10, 20, 30], 0.9);   // tracks 30 more closely
 * ```
 */
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

/**
 * Computes the Weighted Moving Average of the last `window` values.
 *
 * Weights are linear: the most recent observation receives weight `n`,
 * the one before it `n - 1`, and so on down to `1`. This makes the
 * result more responsive to recent movements than a plain SMA without
 * the full exponential decay of EMA.
 *
 * @param values - Historical observations, oldest first.
 * @param window - Number of trailing observations to weight.
 * @returns The weighted mean, or `0` when `values` is empty.
 *
 * @example
 * ```ts
 * weightedMovingAverage([10, 20, 30], 3); // (1*10 + 2*20 + 3*30) / 6 ≈ 23.3
 * ```
 */
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

/**
 * Fits an ordinary least-squares (OLS) line to a series and returns its
 * slope and intercept.
 *
 * The independent variable is the observation index `0..n−1`; the model
 * is `y = slope·x + intercept`.
 *
 * This is exposed as a standalone helper so callers that need multiple
 * future points (see {@link forecastSeries}) can fit the line **once**
 * on the observed data and then walk along it. That is the correct
 * strategy for linear extrapolation — re-fitting on an extended series
 * (which includes the previous predictions) inflates the apparent slope
 * at every step, producing runaway growth.
 *
 * Degenerate cases:
 * - Empty series → `{ slope: 0, intercept: 0 }`.
 * - Single observation → `{ slope: 0, intercept: values[0] }`.
 * - Zero-variance x (defensive; impossible with distinct indices) →
 *   `{ slope: 0, intercept: values[n − 1] }`.
 *
 * @param values - Historical observations, oldest first.
 * @returns The fitted line's `slope` and `intercept`.
 */
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

/**
 * Forecasts the next value using ordinary least-squares linear regression.
 *
 * Fits a line to the series and evaluates it at `x = n` — one step past
 * the last observation. Equivalent to
 * `fitLinearRegression(values)` followed by evaluation at index `n`.
 *
 * For multi-step extrapolation, prefer {@link fitLinearRegression} and
 * evaluate the same line at `x = n, n+1, …` so the slope stays anchored
 * to the observed data.
 *
 * @param values - Historical observations, oldest first.
 * @returns The extrapolated value at the next index.
 */
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
 * ### Density dispatch
 *
 * The function starts by measuring the input series' density. Two paths
 * follow:
 *
 * - **Non-dense series** (`density < 0.7`) — event-driven and semi-dense
 *   series both take this path. The four methods are skipped, and the
 *   historical **mean rate** is returned as a flat per-bucket
 *   prediction: `sum / length` for each of the `steps` buckets. Summed
 *   over the horizon, this equals the expected amount the user will
 *   receive or pay.
 *
 * - **Dense series** (`density ≥ 0.7`) — the requested method is
 *   applied. The series is first winsorized, then either handed to the
 *   requested moving average (recursive) or to linear regression
 *   (fit-once), following the strategy described in the module docs.
 *
 * ### Total-based fallback
 *
 * Even on dense series, if the method's raw total is less than
 * {@link METHOD_TOTAL_MIN_RATIO} of the mean-rate projection, the
 * method has latched onto a recent lull. The mean rate is returned
 * instead, which is the statistically correct expectation for a
 * stationary series.
 *
 * ### Sanitization
 *
 * Every prediction is post-processed:
 * - Non-finite results (`NaN`, `Infinity`) become `0`.
 * - Negative results are clamped to `0`.
 * - Values are rounded to the nearest integer.
 *
 * ### Note on identical outputs
 *
 * On non-dense series (income, sporadic expenses), all four methods
 * return the same output — the mean rate. This is not a bug: a moving
 * average cannot extract more signal than the mean from a series whose
 * information lives in a handful of isolated events. The four methods
 * only produce distinct outputs on dense series.
 *
 * @param values - Historical observations, oldest first.
 * @param method - Which algorithm to apply.
 * @param steps - Number of future values to generate. Must be ≥ `1`;
 *                non-positive values yield an empty array.
 * @returns A `number[]` of length `steps`, oldest prediction first.
 *
 * @example
 * ```ts
 * // Dense series — method-specific behavior.
 * forecastSeries([100, 110, 105, 115, 108, 112, 107], "linear", 3);
 *
 * // Non-dense series — mean rate projected flat, regardless of method.
 * forecastSeries([0, 0, 0, 0, 500, 0, 0, 0], "sma", 4);    // → [≈63, ≈63, ≈63, ≈63]
 * forecastSeries([0, 0, 0, 0, 500, 0, 0, 0], "linear", 4); // → [≈63, ≈63, ≈63, ≈63]
 * ```
 */
export function forecastSeries(
  values: number[],
  method: ForecastMethod,
  steps: number,
): number[] {
  if (values.length === 0 || steps <= 0) return [];

  // ─── Diagnostic quantities used by both safeguards ─────────
  const sum = values.reduce((s, v) => s + v, 0);
  const meanRate = sum / values.length;
  const expectedTotal = meanRate * steps;

  /** Mean-rate prediction, sanitized for use as a per-bucket value. */
  const meanRatePrediction = (() => {
    const r = Math.max(0, Math.round(meanRate));
    return Number.isFinite(r) ? r : 0;
  })();

  // ─── Non-dense series: project the mean rate ───────────────
  //
  // Event-driven and semi-dense series both arrive here. The four
  // moving-average methods cannot forecast a series whose signal
  // lives in a minority of isolated spikes: their sliding windows
  // either miss the spike entirely (short windows) or average it away
  // (long windows). The statistically honest projection is the mean
  // rate over the observation window, projected flat into the future.
  if (computeDensity(values) < DENSE_SERIES_MIN_DENSITY) {
    return Array.from({ length: steps }, () => meanRatePrediction);
  }

  // ─── Dense series: compute the requested method's raw forecast ─
  //
  // Winsorization is a no-op on non-dense series, but we've already
  // returned for those. On dense series it caps extreme values so they
  // cannot dominate the fit.
  const cleaned = winsorizeOutliers(values);

  let rawForecast: number[];

  if (method === "linear") {
    // Linear regression must be applied fit-once: the line is fitted
    // exactly once on the observed data and then evaluated at
    // x = n, n+1, …, n + steps − 1. Re-fitting on the extended series
    // would inflate the slope at every step and produce runaway growth.
    const { slope, intercept } = fitLinearRegression(cleaned);
    const n = cleaned.length;
    rawForecast = [];
    for (let i = 0; i < steps; i++) {
      let next = intercept + slope * (n + i);
      if (!Number.isFinite(next) || next < 0) next = 0;
      rawForecast.push(Math.round(next));
    }
  } else {
    // Moving averages are safe to apply recursively: their windows
    // dampen drift, so appending a prediction cannot make the next
    // prediction run away.
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

  // ─── Safeguard: total-based fallback ───────────────────────
  //
  // If the method's raw total is dramatically smaller than the mean
  // rate would predict, the method has latched onto a recent lull and
  // is under-forecasting by an order of magnitude. Fall back to the
  // mean rate, which is the statistically correct expectation.
  const rawTotal = rawForecast.reduce((s, v) => s + v, 0);
  if (expectedTotal > 0 && rawTotal < expectedTotal * METHOD_TOTAL_MIN_RATIO) {
    return Array.from({ length: steps }, () => meanRatePrediction);
  }

  return rawForecast;
}
