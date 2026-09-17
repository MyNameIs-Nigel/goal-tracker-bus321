/**
 * docs/DATA_MODEL.md § Periods, § Active vs. counting.
 */
import {
  addDays,
  compareDates,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from "@/lib/dates";

export type Cadence = "daily" | "weekly" | "monthly";

export type Period = { start: string; end: string };

export type GoalLifespan = { startsOn: string; endsOn: string | null };

export type ContractWindow = {
  contractStart: string | null;
  contractEnd: string | null;
};

/** The period of `cadence` containing `date`. */
export function periodFor(cadence: Cadence, date: string): Period {
  if (cadence === "daily") return { start: date, end: date };
  if (cadence === "weekly") {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }
  const start = startOfMonth(date);
  return { start, end: endOfMonth(date) };
}

/** G is active on `date` — decides what Today/Day *display*. */
export function isActive(goal: GoalLifespan, date: string): boolean {
  return (
    compareDates(goal.startsOn, date) <= 0 &&
    (goal.endsOn === null || compareDates(date, goal.endsOn) <= 0)
  );
}

/** G counts in P — decides what can fail and feeds the streak. */
export function countsInPeriod(
  goal: GoalLifespan,
  period: Period,
  contract: ContractWindow,
): boolean {
  if (compareDates(goal.startsOn, period.start) > 0) return false;
  if (goal.endsOn !== null && compareDates(goal.endsOn, period.end) < 0) {
    return false;
  }
  if (
    contract.contractStart &&
    compareDates(period.start, contract.contractStart) < 0
  ) {
    return false;
  }
  if (
    contract.contractEnd &&
    compareDates(period.end, contract.contractEnd) > 0
  ) {
    return false;
  }
  return true;
}

/** Every candidate period-start of `cadence` whose start falls in month `M` ("YYYY-MM"). */
export function periodStartsInMonth(cadence: Cadence, month: string): string[] {
  const monthStart = `${month}-01`;
  if (cadence === "monthly") return [monthStart];

  const monthEnd = endOfMonth(monthStart);
  const starts: string[] = [];
  for (let d = monthStart; compareDates(d, monthEnd) <= 0; d = addDays(d, 1)) {
    if (cadence === "daily" || d === startOfWeek(d)) starts.push(d);
  }
  return starts;
}
