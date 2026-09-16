/**
 * docs/DATA_MODEL.md § Completed, § Excused, § Status of (G, P), § Day
 * status, § Streak, § Failures in month M. All pure — `today` is always a
 * parameter, never `new Date()` (docs/TESTING.md).
 */
import { addDays, compareDates } from "@/lib/dates";
import {
  countsInPeriod,
  periodFor,
  periodStartsInMonth,
  type Cadence,
  type ContractWindow,
  type GoalLifespan,
  type Period,
} from "@/lib/periods";

export type Goal = GoalLifespan & { id: string; cadence: Cadence };

export type Completion = { goalId: string; periodStart: string };

export type Exception = {
  goalId: string | null;
  startsOn: string;
  endsOn: string;
  reason: string;
};

export type Status =
  "not-counting" | "done" | "excused" | "failed" | "pending" | "upcoming";

export function isCompleted(
  goalId: string,
  periodStart: string,
  completions: readonly Completion[],
): boolean {
  return completions.some(
    (completion) =>
      completion.goalId === goalId && completion.periodStart === periodStart,
  );
}

function overlaps(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return compareDates(aStart, bEnd) <= 0 && compareDates(bStart, aEnd) <= 0;
}

function excuses(
  goal: Pick<Goal, "id" | "cadence">,
  period: Period,
  exception: Exception,
): boolean {
  if (exception.goalId === goal.id) {
    return overlaps(
      exception.startsOn,
      exception.endsOn,
      period.start,
      period.end,
    );
  }
  if (exception.goalId !== null) return false;
  if (goal.cadence === "daily") {
    return (
      compareDates(exception.startsOn, period.start) <= 0 &&
      compareDates(period.start, exception.endsOn) <= 0
    );
  }
  return (
    compareDates(exception.startsOn, period.start) <= 0 &&
    compareDates(exception.endsOn, period.end) >= 0
  );
}

export function isExcused(
  goal: Pick<Goal, "id" | "cadence">,
  period: Period,
  exceptions: readonly Exception[],
): boolean {
  return exceptions.some((exception) => excuses(goal, period, exception));
}

/** The exception that excuses (G, P), for its `reason` (EXC-08). */
export function excusingException(
  goal: Pick<Goal, "id" | "cadence">,
  period: Period,
  exceptions: readonly Exception[],
): Exception | null {
  return (
    exceptions.find((exception) => excuses(goal, period, exception)) ?? null
  );
}

export function statusOf({
  goal,
  period,
  today,
  contract,
  completions,
  exceptions,
}: {
  goal: Goal;
  period: Period;
  today: string;
  contract: ContractWindow;
  completions: readonly Completion[];
  exceptions: readonly Exception[];
}): Status {
  if (!countsInPeriod(goal, period, contract)) return "not-counting";
  if (isCompleted(goal.id, period.start, completions)) return "done";
  if (isExcused(goal, period, exceptions)) return "excused";
  if (compareDates(period.end, today) < 0) return "failed";
  if (
    compareDates(period.start, today) <= 0 &&
    compareDates(today, period.end) <= 0
  ) {
    return "pending";
  }
  return "upcoming";
}

export type DayStatus =
  "none" | "upcoming" | "clean" | "excused" | "missed" | "open";

/** Day status for daily goals only (drives the history calendar and streak). */
export function dayStatusFor({
  date,
  today,
  dailyGoals,
  contract,
  completions,
  exceptions,
}: {
  date: string;
  today: string;
  dailyGoals: readonly Goal[];
  contract: ContractWindow;
  completions: readonly Completion[];
  exceptions: readonly Exception[];
}): DayStatus {
  const period = periodFor("daily", date);
  const counting = dailyGoals.filter((goal) =>
    countsInPeriod(goal, period, contract),
  );
  if (counting.length === 0) return "none";
  if (compareDates(date, today) > 0) return "upcoming";

  const statuses = counting.map((goal) =>
    statusOf({ goal, period, today, contract, completions, exceptions }),
  );
  const allDoneOrExcused = statuses.every(
    (s) => s === "done" || s === "excused",
  );
  const anyDone = statuses.some((s) => s === "done");
  if (allDoneOrExcused && anyDone) return "clean";
  if (statuses.every((s) => s === "excused")) return "excused";
  if (compareDates(date, today) < 0) return "missed";
  return "open";
}

const MAX_STREAK_LOOKBACK_DAYS = 3660;

/** Consecutive clean days walking backwards from today; excused is neutral. */
export function computeStreak({
  today,
  dailyGoals,
  contract,
  completions,
  exceptions,
}: {
  today: string;
  dailyGoals: readonly Goal[];
  contract: ContractWindow;
  completions: readonly Completion[];
  exceptions: readonly Exception[];
}): number {
  const args = { dailyGoals, contract, completions, exceptions };
  const todayStatus = dayStatusFor({ date: today, today, ...args });
  let cursor =
    todayStatus === "clean" || todayStatus === "excused"
      ? today
      : addDays(today, -1);

  let streak = 0;
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const status = dayStatusFor({ date: cursor, today, ...args });
    if (status === "clean") {
      streak++;
    } else if (status !== "excused") {
      break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Failures whose period starts in month `M` ("YYYY-MM"). */
export function failuresInMonth({
  month,
  today,
  goals,
  contract,
  completions,
  exceptions,
}: {
  month: string;
  today: string;
  goals: readonly Goal[];
  contract: ContractWindow;
  completions: readonly Completion[];
  exceptions: readonly Exception[];
}): number {
  let count = 0;
  for (const goal of goals) {
    for (const start of periodStartsInMonth(goal.cadence, month)) {
      const period = periodFor(goal.cadence, start);
      if (!countsInPeriod(goal, period, contract)) continue;
      const status = statusOf({
        goal,
        period,
        today,
        contract,
        completions,
        exceptions,
      });
      if (status === "failed") count++;
    }
  }
  return count;
}
