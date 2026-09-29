/**
 * Pure view-model for /history (docs/specs/history.md § Definitions). Takes
 * one team's rows plus the month's check-ins on it and produces exactly
 * what the page renders — no DB access, `today` is always a parameter.
 */
import {
  addDays,
  compareDates,
  daysBetween,
  endOfMonth,
  formatMonthLong,
  formatMonthName,
  formatMonthShort,
  formatMonthShortYear,
  isoWeekday,
  monthKey,
} from "@/lib/dates";
import { countsInPeriod, periodFor, periodStartsInMonth } from "@/lib/periods";
import type { PartnerSummary } from "@/lib/queries/checkins";
import {
  dayStatusFor,
  statusOf,
  type Completion,
  type DayStatus,
  type Status,
} from "@/lib/status";
import type { Contract, ExceptionRecord, ViewGoal } from "@/lib/view/day";

export type CalendarCell = {
  date: string;
  day: number;
  status: DayStatus;
  label: string;
  isToday: boolean;
  /** HIST-09 — before contract_start or after contract_end. */
  outsideContract: boolean;
};

export type PeriodRow = { title: string; period: string; status: Status };

export type PartnerDay = {
  date: string;
  state: "checked" | "missed" | "future";
};

/** HIST-06 — a partner over the contract window, as a contribution grid. */
export type PartnerRecord = PartnerSummary & {
  checked: number;
  elapsed: number;
  /** One column per Mon–Sun week; `null` for days outside the window. */
  weeks: (PartnerDay | null)[][];
};

export type DateWindow = { start: string; end: string };

export type HistoryData = {
  month: string;
  monthLabel: string;
  today: string;
  nav: { prev: string | null; next: string | null };
  weeks: (CalendarCell | null)[][];
  failures: string[];
  exceptions: string[];
  completion: { done: number; total: number; percent: number } | null;
  periods: PeriodRow[];
  partnerRange: string;
  partners: PartnerRecord[];
};

/** A check-in on the team as /history needs it. */
export type MonthCheckin = { userId: string; date: string };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** HIST-08 — `?month=` or today's month. */
export function parseMonth(
  param: string | string[] | undefined,
  today: string,
): string {
  return typeof param === "string" && MONTH.test(param)
    ? param
    : monthKey(today);
}

function shiftMonth(month: string, by: number): string {
  const [year, m] = month.split("-").map(Number);
  const index = year * 12 + (m - 1) + by;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/** HIST-02 — bounded by the contract start's month and today's month. */
export function monthNav(
  month: string,
  today: string,
  contractStart: string | null,
): { prev: string | null; next: string | null } {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return {
    prev: contractStart && prev < monthKey(contractStart) ? null : prev,
    next: next > monthKey(today) ? null : next,
  };
}

/** HIST-01 — Mon–Sun rows for the month, padded with nulls. */
export function buildCalendar(month: string): (string | null)[][] {
  const first = `${month}-01`;
  const last = endOfMonth(first);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = [];
  const lead = daysBetween(periodFor("weekly", first).start, first);
  for (let i = 0; i < lead; i++) week.push(null);
  for (let d = first; compareDates(d, last) <= 0; d = addDays(d, 1)) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export function periodLabel(
  cadence: ViewGoal["cadence"],
  start: string,
): string {
  if (cadence === "daily") return formatMonthShort(start);
  if (cadence === "weekly") return `Week of ${formatMonthShort(start)}`;
  return formatMonthName(start);
}

export function exceptionDates(exception: ExceptionRecord): string {
  return exception.startsOn === exception.endsOn
    ? formatMonthShort(exception.startsOn)
    : `${formatMonthShort(exception.startsOn)} – ${formatMonthShort(exception.endsOn)}`;
}

const CADENCE_ORDER = { daily: 0, weekly: 1, monthly: 2 } as const;

export function buildHistoryData({
  month,
  today,
  goals,
  contract,
  completions,
  exceptions,
  partners,
  checkins,
}: {
  month: string;
  today: string;
  goals: readonly ViewGoal[];
  contract: Contract;
  completions: readonly Completion[];
  exceptions: readonly ExceptionRecord[];
  partners: readonly PartnerSummary[];
  checkins: readonly MonthCheckin[];
}): HistoryData {
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(monthStart);
  const dailyGoals = goals.filter((goal) => goal.cadence === "daily");
  const statusArgs = { today, contract, completions, exceptions };
  const partnerSpan = partnerWindow(month, today, contract);

  const weeks = buildCalendar(month).map((week) =>
    week.map((date): CalendarCell | null => {
      if (!date) return null;
      const status = dayStatusFor({ date, dailyGoals, ...statusArgs });
      const outsideContract = isOutsideContract(date, contract);
      return {
        date,
        day: Number(date.slice(8)),
        status,
        label: `${formatMonthLong(date)}, ${
          outsideContract
            ? "outside contract"
            : status === "none"
              ? "not counting"
              : status
        }`,
        isToday: date === today,
        outsideContract,
      };
    }),
  );

  // Every (G, P) with P.start in the month, in period order.
  const sortedGoals = [...goals].sort(
    (a, b) =>
      CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence] ||
      a.sortOrder - b.sortOrder,
  );
  const failures: { start: string; goal: ViewGoal; label: string }[] = [];
  let done = 0;
  let failed = 0;
  const periods: PeriodRow[] = [];
  for (const goal of sortedGoals) {
    for (const start of periodStartsInMonth(goal.cadence, month)) {
      const period = periodFor(goal.cadence, start);
      const alive =
        compareDates(goal.startsOn, period.end) <= 0 &&
        (goal.endsOn === null || compareDates(goal.endsOn, period.start) >= 0);
      if (!alive) continue;
      const status = statusOf({ goal, period, ...statusArgs });
      if (goal.cadence !== "daily") {
        periods.push({
          title: goal.title,
          period: periodLabel(goal.cadence, start),
          status,
        });
      }
      if (!countsInPeriod(goal, period, contract)) continue;
      if (status === "failed") {
        failed++;
        failures.push({
          start,
          goal,
          label: `${periodLabel(goal.cadence, start)} · ${goal.title}`,
        });
      } else if (status === "done" && compareDates(period.end, today) < 0) {
        done++;
      }
    }
  }
  failures.sort(
    (a, b) =>
      compareDates(a.start, b.start) ||
      CADENCE_ORDER[a.goal.cadence] - CADENCE_ORDER[b.goal.cadence] ||
      a.goal.sortOrder - b.goal.sortOrder,
  );

  const titles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const exceptionLabels = [...exceptions]
    .filter(
      (e) =>
        compareDates(e.startsOn, monthEnd) <= 0 &&
        compareDates(e.endsOn, monthStart) >= 0,
    )
    .sort((a, b) => compareDates(a.startsOn, b.startsOn))
    .map(
      (e) =>
        `${exceptionDates(e)} · ${e.goalId ? (titles.get(e.goalId) ?? "Goal") : "Whole day"} · ${e.reason}`,
    );

  const total = done + failed;
  const completion =
    total === 0
      ? null
      : { done, total, percent: Math.round((done / total) * 100) };

  return {
    month,
    monthLabel: `${formatMonthName(monthStart)} ${month.slice(0, 4)}`,
    today,
    nav: monthNav(month, today, contract.contractStart),
    weeks,
    failures: failures.map((f) => f.label),
    exceptions: exceptionLabels,
    completion,
    periods,
    partnerRange: windowLabel(partnerSpan),
    partners: partnerRecords({
      span: partnerSpan,
      today,
      partners,
      checkins,
    }),
  };
}

/** HIST-09 — a date the contract doesn't cover (never, for an unset side). */
export function isOutsideContract(date: string, contract: Contract): boolean {
  return (
    (contract.contractStart !== null &&
      compareDates(date, contract.contractStart) < 0) ||
    (contract.contractEnd !== null &&
      compareDates(date, contract.contractEnd) > 0)
  );
}

/**
 * HIST-06 — the contract; with no end, through today (at least its start
 * day); with no start, month `M`.
 */
export function partnerWindow(
  month: string,
  today: string,
  contract: Contract,
): DateWindow {
  const { contractStart: start, contractEnd: end } = contract;
  if (start === null) {
    const monthStart = `${month}-01`;
    return { start: monthStart, end: endOfMonth(monthStart) };
  }
  if (end !== null) return { start, end };
  return { start, end: compareDates(today, start) < 0 ? start : today };
}

/** "Sep 19 – Nov 19", with years only when the window crosses one. */
function windowLabel({ start, end }: DateWindow): string {
  return start.slice(0, 4) === end.slice(0, 4)
    ? `${formatMonthShort(start)} – ${formatMonthShort(end)}`
    : `${formatMonthShortYear(start)} – ${formatMonthShortYear(end)}`;
}

/** HIST-06 / PCI-09 — N of M elapsed window days per partner, plus the grid. */
function partnerRecords({
  span,
  today,
  partners,
  checkins,
}: {
  span: DateWindow;
  today: string;
  partners: readonly PartnerSummary[];
  checkins: readonly MonthCheckin[];
}): PartnerRecord[] {
  const gridStart = periodFor("weekly", span.start).start;
  const gridEnd = periodFor("weekly", span.end).end;

  return partners.map((person) => {
    const checkedDates = new Set(
      checkins.filter((c) => c.userId === person.id).map((c) => c.date),
    );
    const weeks: (PartnerDay | null)[][] = [];
    let checked = 0;
    let elapsed = 0;
    for (let d = gridStart; compareDates(d, gridEnd) <= 0; d = addDays(d, 1)) {
      if (isoWeekday(d) === 1) weeks.push([]);
      const week = weeks[weeks.length - 1];
      if (compareDates(d, span.start) < 0 || compareDates(d, span.end) > 0) {
        week.push(null);
      } else if (compareDates(d, today) > 0) {
        week.push({ date: d, state: "future" });
      } else {
        elapsed++;
        if (checkedDates.has(d)) {
          checked++;
          week.push({ date: d, state: "checked" });
        } else {
          week.push({ date: d, state: "missed" });
        }
      }
    }
    return { ...person, checked, elapsed, weeks };
  });
}
