"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { toggleCompletion } from "@/lib/actions/completions";
import { contractDayLabel } from "@/lib/contract-day";
import {
  addDays,
  compareDates,
  formatMonthShort,
  formatWeekdayLong,
  formatWeekdayShort,
  monthKey,
} from "@/lib/dates";
import { periodFor } from "@/lib/periods";
import { computeStreak, failuresInMonth, type Completion } from "@/lib/status";
import {
  buildDayGroups,
  failuresLabel,
  progressLabel,
  streakLabel,
  type GoalStatusView,
} from "@/lib/view/day";

import type { DayPageData } from "@/lib/day-page";

function statusText(goal: GoalStatusView): string {
  switch (goal.status) {
    case "done":
      return "Done";
    case "excused":
      return `Excused — ${goal.excusedReason}`;
    case "failed":
      return "Missed";
    case "not-counting":
      return "Not counting yet";
    case "upcoming":
      return "Upcoming";
    default:
      return "Pending";
  }
}

function GoalRow({
  goal,
  canEdit,
  date,
  dueLabel,
  onToggled,
}: {
  goal: GoalStatusView;
  canEdit: boolean;
  date: string;
  dueLabel?: string;
  onToggled: (id: string, completed: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await toggleCompletion(goal.id, date);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onToggled(goal.id, result.completed);
    });
  }

  const content = (
    <>
      {canEdit && (
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            goal.completed
              ? "border-accent bg-accent text-white"
              : "border-border"
          }`}
        >
          {goal.completed ? "✓" : ""}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{goal.title}</span>
        {dueLabel && (
          <span className="block text-xs text-muted">due {dueLabel}</span>
        )}
      </span>
      <span
        className={`text-sm ${goal.status === "done" ? "text-accent" : "text-muted"}`}
      >
        {statusText(goal)}
      </span>
      {error && (
        <span role="alert" className="text-xs text-red-600">
          {error}
        </span>
      )}
    </>
  );

  const className =
    "flex min-h-12 w-full items-center gap-3 rounded-xl border border-border p-3 text-left";

  if (!canEdit) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={pending}
      className={`${className} cursor-pointer`}
    >
      {content}
    </button>
  );
}

/** DT-01..15 — the shared page for /today and /day/[date]. */
export default function DayView(props: DayPageData) {
  const [completions, setCompletions] = useState<Completion[]>(
    props.completions,
  );

  function handleToggled(id: string, completed: boolean) {
    const goal = props.goals.find((g) => g.id === id);
    if (!goal) return;
    const periodStart = periodFor(goal.cadence, props.date).start;

    setCompletions((prev) => {
      const withoutThisPeriod = prev.filter(
        (c) => !(c.goalId === id && c.periodStart === periodStart),
      );
      return completed
        ? [...withoutThisPeriod, { goalId: id, periodStart }]
        : withoutThisPeriod;
    });
  }

  const canEdit =
    props.role === "owner" && compareDates(props.date, props.todayDate) <= 0;

  const groups = useMemo(
    () =>
      buildDayGroups({
        date: props.date,
        today: props.todayDate,
        goals: props.goals,
        contract: props.contract,
        completions,
        exceptions: props.exceptions,
      }),
    [
      props.date,
      props.todayDate,
      props.goals,
      props.contract,
      completions,
      props.exceptions,
    ],
  );

  const streak = useMemo(
    () =>
      computeStreak({
        today: props.todayDate,
        dailyGoals: props.goals.filter((g) => g.cadence === "daily"),
        contract: props.contract,
        completions,
        exceptions: props.exceptions,
      }),
    [
      props.todayDate,
      props.goals,
      props.contract,
      completions,
      props.exceptions,
    ],
  );

  const failures = useMemo(
    () =>
      failuresInMonth({
        month: monthKey(props.todayDate),
        today: props.todayDate,
        goals: props.goals,
        contract: props.contract,
        completions,
        exceptions: props.exceptions,
      }),
    [
      props.todayDate,
      props.goals,
      props.contract,
      completions,
      props.exceptions,
    ],
  );

  const hasAnyGoals =
    groups.daily.length + groups.weekly.length + groups.monthly.length > 0;
  const prevDate = addDays(props.date, -1);
  const nextDate =
    props.date === props.todayDate ? null : addDays(props.date, 1);
  const contractLabel = contractDayLabel(props.todayDate, props.contract);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {formatWeekdayLong(props.date)}
          </h1>
          <nav className="flex items-center gap-3 text-sm font-medium text-muted">
            <Link href={`/day/${prevDate}`}>
              ← {formatMonthShort(prevDate)}
            </Link>
            <Link href="/today">Today</Link>
            {nextDate && (
              <Link href={`/day/${nextDate}`}>
                {formatMonthShort(nextDate)} →
              </Link>
            )}
          </nav>
        </div>
        {contractLabel && <p className="text-sm text-muted">{contractLabel}</p>}
        {props.date !== props.todayDate && (
          <p className="text-sm font-medium text-accent">
            {props.date < props.todayDate
              ? "Editing a past day"
              : "This day hasn't happened yet"}
          </p>
        )}
      </div>

      <p className="text-sm text-muted">
        {streakLabel(streak)} · {failuresLabel(failures, props.todayDate)}
      </p>

      {!hasAnyGoals && (
        <p className="text-muted">
          {props.role === "owner" ? (
            <>
              No goals yet.{" "}
              <Link href="/goals" className="font-medium text-accent">
                Add one
              </Link>
              .
            </>
          ) : (
            `${props.ownerFirstName} hasn't added goals yet.`
          )}
        </p>
      )}

      {groups.daily.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Today
            {progressLabel(groups.daily)
              ? ` · ${progressLabel(groups.daily)}`
              : ""}
          </h2>
          <div className="flex flex-col gap-2">
            {groups.daily.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                canEdit={canEdit}
                date={props.date}
                onToggled={handleToggled}
              />
            ))}
          </div>
        </section>
      )}

      {groups.weekly.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            This week
          </h2>
          <div className="flex flex-col gap-2">
            {groups.weekly.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                canEdit={canEdit}
                date={props.date}
                dueLabel={formatWeekdayShort(goal.periodEnd)}
                onToggled={handleToggled}
              />
            ))}
          </div>
        </section>
      )}

      {groups.monthly.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            This month
          </h2>
          <div className="flex flex-col gap-2">
            {groups.monthly.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                canEdit={canEdit}
                date={props.date}
                dueLabel={formatWeekdayShort(goal.periodEnd)}
                onToggled={handleToggled}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
