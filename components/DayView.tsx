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
} from "@/lib/view/day";

import ExceptionDialog from "@/components/ExceptionDialog";
import PartnerCheckins from "@/components/PartnerCheckins";
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
  isOwner,
  date,
  dueLabel,
  onToggled,
  onExceptionRemoved,
}: {
  goal: GoalStatusView;
  canEdit: boolean;
  isOwner: boolean;
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
    isOwner && goal.status === "excused" && goal.excusedExceptionId;

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

/** DT-01..15 — the shared page for /today and /day/[date]. */
export default function DayView(props: DayPageData) {
  const [completions, setCompletions] = useState<Completion[]>(
    props.completions,
  );
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>(
    props.exceptions,
  );
  const [exceptionDialogOpen, setExceptionDialogOpen] = useState(false);

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

  function handleExceptionCreated(exception: ExceptionRecord) {
    setExceptions((prev) => [...prev, exception]);
    setExceptionDialogOpen(false);
  }

  function handleExceptionRemoved(id: string) {
    setExceptions((prev) => prev.filter((exception) => exception.id !== id));
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
        exceptions,
      }),
    [
      props.date,
      props.todayDate,
      props.goals,
      props.contract,
      completions,
      exceptions,
    ],
  );

  const streak = useMemo(
    () =>
      computeStreak({
        today: props.todayDate,
        dailyGoals: props.goals.filter((g) => g.cadence === "daily"),
        contract: props.contract,
        completions,
        exceptions,
      }),
    [props.todayDate, props.goals, props.contract, completions, exceptions],
  );

  const failures = useMemo(
    () =>
      failuresInMonth({
        month: monthKey(props.todayDate),
        today: props.todayDate,
        goals: props.goals,
        contract: props.contract,
        completions,
        exceptions,
      }),
    [props.todayDate, props.goals, props.contract, completions, exceptions],
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
            <Link href={`/day/${prevDate}`} className="ui-hover-accent">
              ← {formatMonthShort(prevDate)}
            </Link>
            <Link href="/today" className="ui-hover-accent">
              Today
            </Link>
            {nextDate && (
              <Link href={`/day/${nextDate}`} className="ui-hover-accent">
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
              <Link
                href="/goals"
                className="ui-hover-underline font-medium text-accent"
              >
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
                isOwner={props.role === "owner"}
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
                isOwner={props.role === "owner"}
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
                isOwner={props.role === "owner"}
                date={props.date}
                dueLabel={formatWeekdayShort(goal.periodEnd)}
                onToggled={handleToggled}
                onExceptionRemoved={handleExceptionRemoved}
              />
            ))}
          </div>
        </section>
      )}

      {props.role === "owner" &&
        (exceptionDialogOpen ? (
          <ExceptionDialog
            date={props.date}
            goals={props.goals}
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

      <PartnerCheckins
        date={props.date}
        todayDate={props.todayDate}
        role={props.role}
        currentUserId={props.currentUserId}
        partners={props.partners}
        checkins={props.checkins}
      />
    </div>
  );
}
