function replaceNumber(number: string): number {
  return Number(
    number.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))),
  );
}

export function persianDateToEnglishNumber(date: Date): number[] {
  return date
    .toLocaleDateString("fa-ir", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    })
    .split("/")
    .map((item) => replaceNumber(item));
}

export function pastDaysInYear(date: number[]): number {
  let days = date[2];

  if (date[1] <= 6) days += (date[1] - 1) * 31;
  if (date[1] > 6 && date[1] < 12) days += 186 + (date[1] - 7) * 30;
  if (date[1] === 12) days += 336;

  return days;
}
