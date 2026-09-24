"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { toggleCompletion } from "@/lib/actions/completions";
import { removeException } from "@/lib/actions/exceptions";
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
  type ExceptionRecord,
  type GoalStatusView,
  type ViewGoal,
} from "@/lib/view/day";

import ExceptionDialog from "@/components/ExceptionDialog";
import QuickAddGoal from "@/components/QuickAddGoal";
import TeamCheckins from "@/components/TeamCheckins";
import TeammateList from "@/components/TeammateList";
import type { DayPageData } from "@/lib/day-page";
import { teamPaths } from "@/lib/paths";

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
  isOwn,
  date,
  dueLabel,
  onToggled,
  onExceptionRemoved,
}: {
  goal: GoalStatusView;
  canEdit: boolean;
  isOwn: boolean;
  date: string;
  dueLabel?: string;
  onToggled: (id: string, completed: boolean) => void;
  onExceptionRemoved: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [removePending, startRemoveTransition] = useTransition();

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

  function handleRemoveException() {
    const exceptionId = goal.excusedExceptionId;
    if (!exceptionId || removePending) return;
    if (!window.confirm("Remove this exception?")) return;
    startRemoveTransition(async () => {
      const result = await removeException(exceptionId);
      if (result.ok) onExceptionRemoved(exceptionId);
    });
  }

  const content = (
    <>
      {canEdit && (
        <span
          aria-hidden
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
            goal.completed
              ? "border-accent bg-accent text-on-accent"
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

  // `ui-hover-surface` only when the row is a button: a fill promises a
  // click, and a reader's row cannot deliver one (HOVER-04).
  const rowClassName =
    "flex min-h-12 w-full items-center gap-3 rounded-xl border border-border p-3 text-left";

  const canRemoveException =
    isOwn && goal.status === "excused" && goal.excusedExceptionId;

  return (
    <div className="flex flex-col gap-1">
      {canEdit ? (
        <button
          type="button"
          onClick={handleToggle}
          disabled={pending}
          className={`${rowClassName} ui-hover-surface cursor-pointer`}
        >
          {content}
        </button>
      ) : (
        <div className={`${rowClassName} ui-hover-edge`}>{content}</div>
      )}
      {canRemoveException && (
        <button
          type="button"
          onClick={handleRemoveException}
          disabled={removePending}
          className="ui-hover-accent self-start pl-3 text-xs font-medium text-muted underline"
        >
          Remove exception
        </button>
      )}
    </div>
  );
}

/**
 * DT-01..17 — one team's day: your own (/today, /day/[date]) or a teammate's
 * (/team/[id], /team/[id]/day/[date]), read-only for them.
 */
export default function DayView(props: DayPageData) {
  const [goals, setGoals] = useState<ViewGoal[]>(props.goals);
  const [completions, setCompletions] = useState<Completion[]>(
    props.completions,
  );
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(
    props.exceptions,
  );
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

  function handleToggled(id: string, completed: boolean) {
    const goal = goals.find((g) => g.id === id);
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

  function handleExceptionCreated(exception: ExceptionRecord) {
    setExceptions((prev) => [...prev, exception]);
    setExceptionDialogOpen(false);
  }

  function handleExceptionRemoved(id: string) {
    setExceptions((prev) => prev.filter((exception) => exception.id !== id));
  }

  const paths = teamPaths(props.isOwn ? null : props.team.id);
  const canEdit = props.isOwn && compareDates(props.date, props.todayDate) <= 0;

  const groups = useMemo(
    () =>
      buildDayGroups({
        date: props.date,
        today: props.todayDate,
        goals,
        contract: props.contract,
        completions,
        exceptions,
      }),
    [
      props.date,
      props.todayDate,
      goals,
      props.contract,
      completions,
      exceptions,
    ],
  );

  const streak = useMemo(
    () =>
      computeStreak({
        today: props.todayDate,
        dailyGoals: goals.filter((g) => g.cadence === "daily"),
        contract: props.contract,
        completions,
        exceptions,
      }),
    [props.todayDate, goals, props.contract, completions, exceptions],
  );

  const failures = useMemo(
    () =>
      failuresInMonth({
        month: monthKey(props.todayDate),
        today: props.todayDate,
        goals,
        contract: props.contract,
        completions,
        exceptions,
      }),
    [props.todayDate, goals, props.contract, completions, exceptions],
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
          <nav
            aria-label="Days"
            className="flex items-center gap-3 text-sm font-medium text-muted"
          >
            <Link href={paths.day(prevDate)} className="ui-hover-accent">
              ← {formatMonthShort(prevDate)}
            </Link>
            <Link href={paths.today} className="ui-hover-accent">
              Today
            </Link>
            {nextDate && (
              <Link href={paths.day(nextDate)} className="ui-hover-accent">
                {formatMonthShort(nextDate)} →
              </Link>
            )}
          </nav>
        </div>
        {contractLabel && <p className="text-sm text-muted">{contractLabel}</p>}
        {props.isOwn && props.date !== props.todayDate && (
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

      {!hasAnyGoals &&
        (props.isOwn ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted">No goals yet.</p>
            <QuickAddGoal
              onAdded={(goal) => setGoals((prev) => [...prev, goal])}
            />
          </div>
        ) : (
          <p className="text-muted">
            {`${props.team.firstName} hasn't added goals yet.`}
          </p>
        ))}

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
                isOwn={props.isOwn}
                date={props.date}
                onToggled={handleToggled}
                onExceptionRemoved={handleExceptionRemoved}
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
                isOwn={props.isOwn}
                date={props.date}
                dueLabel={formatWeekdayShort(goal.periodEnd)}
                onToggled={handleToggled}
                onExceptionRemoved={handleExceptionRemoved}
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
                isOwn={props.isOwn}
                date={props.date}
                dueLabel={formatWeekdayShort(goal.periodEnd)}
                onToggled={handleToggled}
                onExceptionRemoved={handleExceptionRemoved}
              />
            ))}
          </div>
        </section>
      )}

      {props.isOwn &&
        (exceptionDialogOpen ? (
          <ExceptionDialog
            date={props.date}
            goals={goals}
            onCancel={() => setExceptionDialogOpen(false)}
            onCreated={handleExceptionCreated}
          />
        ) : (
          <button
            type="button"
            onClick={() => setExceptionDialogOpen(true)}
            className="ui-hover-surface self-start rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Mark an exception
          </button>
        ))}

      {props.teammates && (
        <TeammateList
          date={props.date}
          teammates={props.teammates}
          shareUrl={props.shareUrl}
        />
      )}

      <TeamCheckins
        heading={props.isOwn ? "Checked on you" : "Partners"}
        teamId={props.team.id}
        teamFirstName={props.team.firstName}
        date={props.date}
        todayDate={props.todayDate}
        currentUserId={props.currentUserId}
        partners={props.partners}
        checkins={props.checkins}
      />
    </div>
  );
}
