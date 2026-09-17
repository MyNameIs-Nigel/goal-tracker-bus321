/**
 * Pure view-model for /history (docs/specs/history.md § Definitions). Takes
 * the whole tracker's rows plus the month's check-ins and produces exactly
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
};

export type PeriodRow = { title: string; period: string; status: Status };

export type PartnerMonth = PartnerSummary & {
  checked: number;
  elapsed: number;
  days: ("checked" | "missed" | "future")[];
};

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
  partners: PartnerMonth[];
};

/** A check-in as /history needs it; `userName` covers users no longer partners. */
export type MonthCheckin = {
  userId: string;
  date: string;
  userName?: string;
};

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

function periodLabel(cadence: ViewGoal["cadence"], start: string): string {
  if (cadence === "daily") return formatMonthShort(start);
  if (cadence === "weekly") return `Week of ${formatMonthShort(start)}`;
  return formatMonthName(start);
}

function exceptionDates(exception: ExceptionRecord): string {
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

  const weeks = buildCalendar(month).map((week) =>
    week.map((date): CalendarCell | null => {
      if (!date) return null;
      const status = dayStatusFor({ date, dailyGoals, ...statusArgs });
      return {
        date,
        day: Number(date.slice(8)),
        status,
        label: `${formatMonthLong(date)}, ${status === "none" ? "not counting" : status}`,
        isToday: date === today,
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
    partners: partnerMonths({
      month,
      today,
      partners,
      checkins,
    }),
  };
}

/** HIST-06 / PCI-09 — N of M elapsed days per partner, plus the day strip. */
function partnerMonths({
  month,
  today,
  partners,
  checkins,
}: {
  month: string;
  today: string;
  partners: readonly PartnerSummary[];
  checkins: readonly MonthCheckin[];
}): PartnerMonth[] {
  const monthStart = `${month}-01`;
  const monthEnd = endOfMonth(monthStart);
  const daysInMonth = daysBetween(monthStart, monthEnd) + 1;
  const elapsed =
    month < monthKey(today)
      ? daysInMonth
      : month === monthKey(today)
        ? Number(today.slice(8))
        : 0;

  const people = new Map<string, PartnerSummary>(
    partners.map((partner) => [partner.id, partner]),
  );
  for (const checkin of checkins) {
    if (!people.has(checkin.userId) && checkin.date.startsWith(month)) {
      people.set(checkin.userId, {
        id: checkin.userId,
        name: checkin.userName ?? "Former partner",
        image: null,
      });
    }
  }
  const extras = [...people.values()]
    .filter((p) => !partners.some((partner) => partner.id === p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [...partners, ...extras].map((person) => {
    const checkedDates = new Set(
      checkins
        .filter((c) => c.userId === person.id && c.date.startsWith(month))
        .map((c) => c.date),
    );
    const days: PartnerMonth["days"] = [];
    let checked = 0;
    for (let i = 0; i < daysInMonth; i++) {
      const date = addDays(monthStart, i);
      if (i >= elapsed) {
        days.push("future");
      } else if (checkedDates.has(date)) {
        days.push("checked");
        checked++;
      } else {
        days.push("missed");
      }
    }
    return { ...person, checked, elapsed, days };
  });
}
