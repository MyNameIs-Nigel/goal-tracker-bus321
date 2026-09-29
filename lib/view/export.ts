/**
 * Pure view-model for /export and its CSV (docs/specs/export.md § Definitions).
 * Takes the session team's rows for a date range and produces exactly what the
 * report and the CSV contain — no DB access, `today` is always a parameter.
 */
import {
  addDays,
  compareDates,
  daysBetween,
  formatMonthName,
  formatMonthShort,
  formatMonthShortYear,
  monthKey,
} from "@/lib/dates";
import { firstName, teamName } from "@/lib/format";
import {
  countsInPeriod,
  isActive,
  periodFor,
  type Cadence,
} from "@/lib/periods";
import type { PartnerSummary } from "@/lib/queries/checkins";
import {
  dayStatusFor,
  excusingException,
  statusOf,
  type Completion,
  type Status,
} from "@/lib/status";
import type { Contract, ExceptionRecord, ViewGoal } from "@/lib/view/day";
import {
  exceptionDates,
  isOutsideContract,
  periodLabel,
  type PeriodRow,
} from "@/lib/view/history";
import { isValidCalendarDate } from "@/lib/validate-date";

export type ExportRange = { from: string; to: string };

export const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  failed: "Missed",
  excused: "Excused",
  pending: "Pending",
  upcoming: "Upcoming",
  "not-counting": "Not counting",
};

const CADENCE_LABEL: Record<Cadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const CADENCE_ORDER = { daily: 0, weekly: 1, monthly: 2 } as const;

/** The longest range a report covers (EXP-05). */
const MAX_RANGE_DAYS = 366;

type Param = string | string[] | undefined;

function dateParam(value: Param): string | null {
  return typeof value === "string" && isValidCalendarDate(value) ? value : null;
}

/** EXP-02 / EXP-03 / EXP-05 — the report's range from `?from=` and `?to=`. */
export function parseRange(
  params: { from?: Param; to?: Param },
  {
    today,
    contract,
    goals,
  }: { today: string; contract: Contract; goals: readonly ViewGoal[] },
): ExportRange {
  const earliestGoal = goals.map((goal) => goal.startsOn).sort(compareDates)[0];
  const defaultFrom = contract.contractStart ?? earliestGoal ?? today;
  let defaultTo = contract.contractEnd ?? today;
  if (compareDates(defaultTo, defaultFrom) < 0) defaultTo = defaultFrom;

  let from = dateParam(params.from) ?? defaultFrom;
  let to = dateParam(params.to) ?? defaultTo;
  if (compareDates(from, to) > 0) [from, to] = [to, from];
  if (daysBetween(from, to) + 1 > MAX_RANGE_DAYS) {
    to = addDays(from, MAX_RANGE_DAYS - 1);
  }
  return { from, to };
}

/** A check-in on the team as the export needs it. */
export type ReceivedCheckin = {
  userId: string;
  date: string;
  note: string | null;
};

/** A check-in the student made, with the owner of the team it was on. */
export type GivenCheckin = {
  ownerName: string;
  date: string;
  note: string | null;
};

export type ExportInput = {
  ownerName: string;
  range: ExportRange;
  today: string;
  goals: readonly ViewGoal[];
  contract: Contract;
  completions: readonly Completion[];
  exceptions: readonly ExceptionRecord[];
  /** Everyone who can appear as a checker: current partners and past ones. */
  partners: readonly PartnerSummary[];
  received: readonly ReceivedCheckin[];
  /** `null` unless the student asked for them (EXP-12). */
  given: readonly GivenCheckin[] | null;
};

export type GoalRecord = {
  id: string;
  title: string;
  cadence: string;
  started: string;
  archived: string | null;
  record: string;
};

export type LogDay = {
  date: string;
  label: string;
  outsideContract: boolean;
  /** One per `dailyGoals` column; `null` when the goal isn't active that day. */
  marks: (Status | null)[];
  checkedBy: string[];
};

export type LogMonth = { month: string; label: string; days: LogDay[] };

export type CheckinGroup = { days: number; entries: string[] };

export type CsvRecord = {
  record: "goal" | "exception" | "check-in received" | "check-in given";
  date: string;
  endDate: string;
  goal: string;
  cadence: string;
  status: string;
  reason: string;
  person: string;
  note: string;
};

export type ExportData = {
  range: ExportRange;
  title: string;
  owner: string;
  rangeLabel: string;
  contractLabel: string;
  exportedLabel: string;
  summary: {
    completion: { done: number; total: number; percent: number } | null;
    failures: number;
    exceptions: number;
    longestStreak: number;
  };
  goals: GoalRecord[];
  dailyGoals: { id: string; title: string }[];
  months: LogMonth[];
  periods: PeriodRow[];
  failures: string[];
  exceptions: string[];
  received: (CheckinGroup & { id: string; name: string })[];
  given: (CheckinGroup & { team: string })[] | null;
  records: CsvRecord[];
};

/** Every period start of `cadence` that falls in the range, in order. */
function periodStartsInRange(cadence: Cadence, range: ExportRange): string[] {
  const starts: string[] = [];
  let start = periodFor(cadence, range.from).start;
  if (compareDates(start, range.from) < 0) {
    start = addDays(periodFor(cadence, range.from).end, 1);
  }
  while (compareDates(start, range.to) <= 0) {
    starts.push(start);
    start = addDays(periodFor(cadence, start).end, 1);
  }
  return starts;
}

function checkinEntry(date: string, note: string | null): string {
  return note ? `${formatMonthShort(date)} — ${note}` : formatMonthShort(date);
}

function monthLabel(month: string): string {
  return `${formatMonthName(`${month}-01`)} ${month.slice(0, 4)}`;
}

function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function contractLabel({ contractStart, contractEnd }: Contract): string {
  if (contractStart && contractEnd) {
    return `Contract: ${formatMonthShortYear(contractStart)} – ${formatMonthShortYear(contractEnd)}`;
  }
  if (contractStart)
    return `Contract: from ${formatMonthShortYear(contractStart)}`;
  if (contractEnd)
    return `Contract: until ${formatMonthShortYear(contractEnd)}`;
  return "No contract dates set";
}

export function buildExport({
  ownerName,
  range,
  today,
  goals,
  contract,
  completions,
  exceptions,
  partners,
  received,
  given,
}: ExportInput): ExportData {
  const statusArgs = { today, contract, completions, exceptions };
  const sortedGoals = [...goals].sort(
    (a, b) =>
      CADENCE_ORDER[a.cadence] - CADENCE_ORDER[b.cadence] ||
      a.sortOrder - b.sortOrder,
  );

  // Every (G, P) with P.start in range whose lifespan overlaps P.
  const goalRecords: GoalRecord[] = [];
  const periods: PeriodRow[] = [];
  const failures: { start: string; order: number; label: string }[] = [];
  const goalCsv: { order: number; row: CsvRecord }[] = [];
  let done = 0;
  let failed = 0;
  sortedGoals.forEach((goal, order) => {
    let goalDone = 0;
    let goalFailed = 0;
    let alive = false;
    for (const start of periodStartsInRange(goal.cadence, range)) {
      const period = periodFor(goal.cadence, start);
      if (
        compareDates(goal.startsOn, period.end) > 0 ||
        (goal.endsOn !== null && compareDates(goal.endsOn, period.start) < 0)
      ) {
        continue;
      }
      alive = true;
      const status = statusOf({ goal, period, ...statusArgs });
      const label = periodLabel(goal.cadence, start);
      if (goal.cadence !== "daily") {
        periods.push({ title: goal.title, period: label, status });
      }
      goalCsv.push({
        order,
        row: {
          record: "goal",
          date: period.start,
          endDate: period.end,
          goal: goal.title,
          cadence: goal.cadence,
          status: STATUS_LABEL[status],
          reason:
            status === "excused"
              ? (excusingException(goal, period, exceptions)?.reason ?? "")
              : "",
          person: "",
          note: "",
        },
      });
      if (!countsInPeriod(goal, period, contract)) continue;
      if (status === "failed") {
        goalFailed++;
        failures.push({ start, order, label: `${label} · ${goal.title}` });
      } else if (status === "done" && compareDates(period.end, today) < 0) {
        goalDone++;
      }
    }
    if (!alive) return;
    done += goalDone;
    failed += goalFailed;
    const total = goalDone + goalFailed;
    goalRecords.push({
      id: goal.id,
      title: goal.title,
      cadence: CADENCE_LABEL[goal.cadence],
      started: `Started ${formatMonthShort(goal.startsOn)}`,
      archived: goal.endsOn
        ? `Archived ${formatMonthShort(goal.endsOn)}`
        : null,
      record:
        total === 0 ? "Nothing counted yet" : `${goalDone} of ${total} done`,
    });
  });
  failures.sort((a, b) => compareDates(a.start, b.start) || a.order - b.order);
  goalCsv.sort(
    (a, b) => compareDates(a.row.date, b.row.date) || a.order - b.order,
  );

  const titles = new Map(goals.map((goal) => [goal.id, goal.title]));
  const rangeExceptions = [...exceptions]
    .filter(
      (e) =>
        compareDates(e.startsOn, range.to) <= 0 &&
        compareDates(e.endsOn, range.from) >= 0,
    )
    .sort((a, b) => compareDates(a.startsOn, b.startsOn));

  // The daily log.
  const dailyGoals = sortedGoals.filter(
    (goal) =>
      goal.cadence === "daily" &&
      compareDates(goal.startsOn, range.to) <= 0 &&
      (goal.endsOn === null || compareDates(goal.endsOn, range.from) >= 0),
  );
  const names = new Map(partners.map((person) => [person.id, person.name]));
  const checkersByDate = new Map<string, string[]>();
  for (const checkin of received) {
    const list = checkersByDate.get(checkin.date) ?? [];
    list.push(firstName(names.get(checkin.userId) ?? "Former partner"));
    checkersByDate.set(checkin.date, list);
  }
  const months: LogMonth[] = [];
  for (let d = range.from; compareDates(d, range.to) <= 0; d = addDays(d, 1)) {
    const month = monthKey(d);
    if (months.at(-1)?.month !== month) {
      months.push({ month, label: monthLabel(month), days: [] });
    }
    months.at(-1)!.days.push({
      date: d,
      label: dayLabel(d),
      outsideContract: isOutsideContract(d, contract),
      marks: dailyGoals.map((goal) =>
        isActive(goal, d)
          ? statusOf({ goal, period: periodFor("daily", d), ...statusArgs })
          : null,
      ),
      checkedBy: [...(checkersByDate.get(d) ?? [])].sort(),
    });
  }

  // Longest run of clean days, excused neutral (EXP-06).
  let longestStreak = 0;
  let run = 0;
  const last = compareDates(range.to, today) < 0 ? range.to : today;
  for (let d = range.from; compareDates(d, last) <= 0; d = addDays(d, 1)) {
    const status = dayStatusFor({ date: d, dailyGoals, ...statusArgs });
    if (status === "clean") {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else if (status !== "excused") {
      run = 0;
    }
  }

  // Check-ins.
  const byDate = <T extends { date: string }>(a: T, b: T) =>
    compareDates(a.date, b.date);
  const receivedGroups = [...partners]
    .map((person) => {
      const mine = received.filter((c) => c.userId === person.id).sort(byDate);
      return {
        id: person.id,
        name: person.name,
        days: mine.length,
        entries: mine.map((c) => checkinEntry(c.date, c.note)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  const givenGroups =
    given === null
      ? null
      : [...new Set(given.map((c) => c.ownerName))]
          .sort((a, b) => a.localeCompare(b))
          .map((owner) => {
            const mine = given
              .filter((c) => c.ownerName === owner)
              .sort(byDate);
            return {
              team: teamName(owner),
              days: mine.length,
              entries: mine.map((c) => checkinEntry(c.date, c.note)),
            };
          });

  const total = done + failed;
  const blank = { endDate: "", goal: "", cadence: "", status: "", reason: "" };
  const records: CsvRecord[] = [
    ...goalCsv.map(({ row }) => row),
    ...rangeExceptions.map((e): CsvRecord => ({
      record: "exception",
      date: e.startsOn,
      endDate: e.endsOn,
      goal: e.goalId ? (titles.get(e.goalId) ?? "") : "",
      cadence: "",
      status: "",
      reason: e.reason,
      person: "",
      note: "",
    })),
    ...[...received].sort(byDate).map((c): CsvRecord => ({
      record: "check-in received",
      date: c.date,
      ...blank,
      person: names.get(c.userId) ?? "Former partner",
      note: c.note ?? "",
    })),
    ...[...(given ?? [])].sort(byDate).map((c): CsvRecord => ({
      record: "check-in given",
      date: c.date,
      ...blank,
      person: teamName(c.ownerName),
      note: c.note ?? "",
    })),
  ];

  return {
    range,
    title: `Goal report — ${ownerName}`,
    owner: `${ownerName} · ${teamName(ownerName)}`,
    rangeLabel: `${formatMonthShortYear(range.from)} – ${formatMonthShortYear(range.to)}`,
    contractLabel: contractLabel(contract),
    exportedLabel: `Exported ${formatMonthShortYear(today)}`,
    summary: {
      completion:
        total === 0
          ? null
          : { done, total, percent: Math.round((done / total) * 100) },
      failures: failures.length,
      exceptions: rangeExceptions.length,
      longestStreak,
    },
    goals: goalRecords,
    dailyGoals: dailyGoals.map((goal) => ({ id: goal.id, title: goal.title })),
    months,
    periods,
    failures: failures.map((f) => f.label),
    exceptions: rangeExceptions.map(
      (e) =>
        `${exceptionDates(e)} · ${e.goalId ? (titles.get(e.goalId) ?? "Goal") : "Whole day"} · ${e.reason}`,
    ),
    received: receivedGroups,
    given: givenGroups,
    records,
  };
}

/** EXP-15 — RFC 4180 quoting, and never a formula in a spreadsheet. */
export function csvField(value: string | null): string {
  if (value === null || value === "") return "";
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

const CSV_COLUMNS = [
  "record",
  "date",
  "end_date",
  "goal",
  "cadence",
  "status",
  "reason",
  "person",
  "note",
] as const;

/** EXP-14 — the CSV body, `\r\n` after every line including the last. */
export function toCsv(records: readonly CsvRecord[]): string {
  const lines = [
    CSV_COLUMNS.join(","),
    ...records.map((r) =>
      [
        r.record,
        r.date,
        r.endDate,
        r.goal,
        r.cadence,
        r.status,
        r.reason,
        r.person,
        r.note,
      ]
        .map(csvField)
        .join(","),
    ),
  ];
  return lines.map((line) => `${line}\r\n`).join("");
}

/** EXP-14 — `goal-report-avery-2026-09-19-to-2026-11-19.csv`. */
export function csvFileName(ownerName: string, range: ExportRange): string {
  const slug = firstName(ownerName)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `goal-report-${slug ? `${slug}-` : ""}${range.from}-to-${range.to}.csv`;
}
