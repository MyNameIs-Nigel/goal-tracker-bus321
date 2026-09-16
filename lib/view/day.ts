/**
 * Pure view-model assembly for /today and /day/[date] (docs/specs/daily-tracking.md).
 * Takes the whole tracker's data (cheap at this scale, ADR-0002 G2) and a
 * date, and produces exactly what the page needs to render — no DB access.
 */
import { formatMonthName } from "@/lib/dates";
import { isActive, periodFor, type Cadence } from "@/lib/periods";
import {
  excusingException,
  isCompleted,
  statusOf,
  type Completion,
  type Exception,
  type Status,
} from "@/lib/status";

export type ViewGoal = {
  id: string;
  title: string;
  cadence: Cadence;
  startsOn: string;
  endsOn: string | null;
  sortOrder: number;
};

export type Contract = {
  contractStart: string | null;
  contractEnd: string | null;
};

export type GoalStatusView = {
  id: string;
  title: string;
  cadence: Cadence;
  status: Status;
  completed: boolean;
  excusedReason: string | null;
  periodEnd: string;
  periodStart: string;
};

export type DayGroups = {
  daily: GoalStatusView[];
  weekly: GoalStatusView[];
  monthly: GoalStatusView[];
};

/** Active goals for `date`, grouped by cadence, each with its status. */
export function buildDayGroups({
  date,
  today,
  goals,
  contract,
  completions,
  exceptions,
}: {
  date: string;
  today: string;
  goals: readonly ViewGoal[];
  contract: Contract;
  completions: readonly Completion[];
  exceptions: readonly Exception[];
}): DayGroups {
  const groups: DayGroups = { daily: [], weekly: [], monthly: [] };

  for (const goal of goals) {
    if (!isActive(goal, date)) continue;

    const period = periodFor(goal.cadence, date);
    const status = statusOf({
      goal,
      period,
      today,
      contract,
      completions,
      exceptions,
    });
    const excusedReason =
      status === "excused"
        ? (excusingException(goal, period, exceptions)?.reason ?? null)
        : null;

    groups[goal.cadence].push({
      id: goal.id,
      title: goal.title,
      cadence: goal.cadence,
      status,
      completed: isCompleted(goal.id, period.start, completions),
      excusedReason,
      periodEnd: period.end,
      periodStart: period.start,
    });
  }

  for (const cadence of ["daily", "weekly", "monthly"] as const) {
    const bySortOrder = new Map(
      goals.map((goal) => [goal.id, goal.sortOrder] as const),
    );
    groups[cadence].sort(
      (a, b) => (bySortOrder.get(a.id) ?? 0) - (bySortOrder.get(b.id) ?? 0),
    );
  }

  return groups;
}

/** DT-10 — "3 of 5 done" / "All done"; null when nothing counts yet. */
export function progressLabel(daily: readonly GoalStatusView[]): string | null {
  const counting = daily.filter((g) => g.status !== "not-counting");
  if (counting.length === 0) return null;
  const done = counting.filter((g) => g.status === "done").length;
  return done === counting.length
    ? "All done"
    : `${done} of ${counting.length} done`;
}

/** DT-11 — "3-day streak" / "No streak yet" / "1-day streak". */
export function streakLabel(streak: number): string {
  return streak === 0 ? "No streak yet" : `${streak}-day streak`;
}

/** DT-12 — "2 failures in September" / "0 failures in September". */
export function failuresLabel(count: number, monthDate: string): string {
  const month = formatMonthName(monthDate);
  return `${count} failure${count === 1 ? "" : "s"} in ${month}`;
}
