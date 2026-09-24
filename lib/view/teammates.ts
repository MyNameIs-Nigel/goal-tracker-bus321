/**
 * The one line under each teammate on /today (docs/DATA_MODEL.md § Teammate
 * summary). Pure — the same rules the teammate's own day page uses.
 */
import { isActive } from "@/lib/periods";
import type { CheckinRecord } from "@/lib/queries/checkins";
import { computeStreak, type Completion } from "@/lib/status";
import {
  buildDayGroups,
  progressLabel,
  streakLabel,
  type Contract,
  type ExceptionRecord,
  type ViewGoal,
} from "@/lib/view/day";

export function teammateSummary({
  today,
  goals,
  contract,
  completions,
  exceptions,
}: {
  today: string;
  goals: readonly ViewGoal[];
  contract: Contract;
  completions: readonly Completion[];
  exceptions: readonly ExceptionRecord[];
}): string {
  if (!goals.some((goal) => isActive(goal, today))) return "No goals yet";

  const { daily } = buildDayGroups({
    date: today,
    today,
    goals,
    contract,
    completions,
    exceptions,
  });
  const streak = computeStreak({
    today,
    dailyGoals: goals.filter((goal) => goal.cadence === "daily"),
    contract,
    completions,
    exceptions,
  });
  return `${progressLabel(daily) ?? "Nothing due today"} · ${streakLabel(streak)}`;
}

/** One row of "Your teammates" on /today. */
export type Teammate = {
  teamId: string;
  name: string;
  image: string | null;
  summary: string;
  checkin: CheckinRecord | null;
};
