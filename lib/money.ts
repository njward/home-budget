import { addMonths, format, startOfMonth, subMonths } from "date-fns";
import type { Decimal } from "@prisma/client/runtime/library";

export function dollars(value: Decimal | number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function currentMonth() {
  return startOfMonth(new Date());
}

export function monthLabel(date: Date) {
  return format(date, "MMMM yyyy");
}

export function recentMonthStarts(count: number) {
  const month = currentMonth();
  return Array.from({ length: count }, (_, index) => subMonths(month, count - index - 1));
}

export function projectWealth(input: {
  startingNetWorth: number;
  monthlyContribution: number;
  annualReturnRate: number;
  annualInflationRate: number;
  horizonYears: number;
}) {
  const monthlyReturn = Math.pow(1 + input.annualReturnRate, 1 / 12) - 1;
  const rows = [];
  let nominal = input.startingNetWorth;

  for (let month = 1; month <= input.horizonYears * 12; month += 1) {
    nominal = nominal * (1 + monthlyReturn) + input.monthlyContribution;

    if (month % 12 === 0) {
      const year = month / 12;
      const real = nominal / Math.pow(1 + input.annualInflationRate, year);
      rows.push({
        date: addMonths(currentMonth(), month),
        year,
        nominal,
        real
      });
    }
  }

  return rows;
}
