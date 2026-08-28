export const GAUGE_MAX_ANGLE = 31.5;

export function computeSplit(income: number, expense: number) {
  const total = income + expense;
  if (total === 0) {
    return { incomePercent: 0, expensePercent: 0, angle: 0 };
  }
  const incomePercent = Math.round((income / total) * 100);
  return {
    incomePercent,
    expensePercent: 100 - incomePercent,
    angle: ((income - expense) / total) * GAUGE_MAX_ANGLE,
  };
}

export function computeDelta(current: number, past: number) {
  const amount = current - past;
  const percent = past === 0 ? (current > 0 ? 100 : 0) : (amount / past) * 100;
  return { amount, percent, isUp: amount >= 0 };
}
