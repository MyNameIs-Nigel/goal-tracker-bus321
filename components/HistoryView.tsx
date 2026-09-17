import Link from "next/link";

import { formatMonthLong, formatMonthName } from "@/lib/dates";
import type { DayStatus, Status } from "@/lib/status";
import type { HistoryData } from "@/lib/view/history";

/** Cell colours: one calm accent for clean; the rest stay quiet (HIST-01 § UI). */
const DOT: Record<DayStatus, string> = {
  clean: "bg-accent",
  missed: "bg-red-500",
  excused: "bg-amber-400",
  open: "border-2 border-accent",
  upcoming: "border border-border",
  none: "border border-border",
};

const LEGEND: { label: string; status: DayStatus }[] = [
  { label: "Clean", status: "clean" },
  { label: "Missed", status: "missed" },
  { label: "Excused", status: "excused" },
  { label: "Open", status: "open" },
  { label: "Not counting", status: "none" },
];

const STATUS_LABEL: Record<Status, string> = {
  done: "Done",
  failed: "Missed",
  excused: "Excused",
  pending: "Pending",
  upcoming: "Upcoming",
  "not-counting": "Not counting",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** HIST-01..08 — the month at a glance. A Server Component: links only. */
export default function HistoryView({ data }: { data: HistoryData }) {
  const { nav } = data;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {data.monthLabel}
        </h1>
        <nav
          aria-label="Months"
          className="flex items-center gap-3 text-sm font-medium text-muted"
        >
          {nav.prev && (
            <Link href={`/history?month=${nav.prev}`}>
              ← {formatMonthName(`${nav.prev}-01`)}
            </Link>
          )}
          {nav.next && (
            <Link href={`/history?month=${nav.next}`}>
              {formatMonthName(`${nav.next}-01`)} →
            </Link>
          )}
        </nav>
      </div>

      <section aria-label="Calendar" className="flex flex-col gap-2">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-muted">
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {data.weeks.flat().map((cell, index) =>
            cell ? (
              <Link
                key={cell.date}
                href={`/day/${cell.date}`}
                aria-label={cell.label}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm ${
                  cell.isToday ? "ring-2 ring-accent" : ""
                } ${cell.status === "none" ? "text-muted" : ""}`}
              >
                <span>{cell.day}</span>
                <span
                  aria-hidden
                  className={`h-2.5 w-2.5 rounded-full ${DOT[cell.status]}`}
                />
              </Link>
            ) : (
              <span key={`pad-${index}`} aria-hidden />
            ),
          )}
        </div>
        <ul
          aria-label="Legend"
          className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
        >
          {LEGEND.map((item) => (
            <li key={item.status} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 rounded-full ${DOT[item.status]}`}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section
          aria-labelledby="failures-heading"
          className="flex flex-col gap-2 rounded-xl border border-border p-4"
        >
          <h2 id="failures-heading" className="font-semibold">
            {plural(data.failures.length, "failure")}
          </h2>
          {data.failures.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {data.failures.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="exceptions-heading"
          className="flex flex-col gap-2 rounded-xl border border-border p-4"
        >
          <h2 id="exceptions-heading" className="font-semibold">
            {plural(data.exceptions.length, "exception")}
          </h2>
          {data.exceptions.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-muted">
              {data.exceptions.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          )}
        </section>
        <section
          aria-labelledby="completion-heading"
          className="flex flex-col gap-1 rounded-xl border border-border p-4 sm:col-span-2"
        >
          <h2 id="completion-heading" className="font-semibold">
            {data.completion
              ? `${data.completion.percent}% complete`
              : "Nothing counted yet"}
          </h2>
          {data.completion && (
            <p className="text-sm text-muted">
              {data.completion.done} of {data.completion.total} counting past
              periods done
            </p>
          )}
        </section>
      </div>

      {data.periods.length > 0 && (
        <section
          aria-labelledby="periods-heading"
          className="flex flex-col gap-2"
        >
          <h2
            id="periods-heading"
            className="text-sm font-semibold uppercase tracking-wide text-muted"
          >
            Weekly &amp; monthly
          </h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th className="py-1 font-medium">Goal</th>
                <th className="py-1 font-medium">Period</th>
                <th className="py-1 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.periods.map((row) => (
                <tr
                  key={`${row.title}-${row.period}`}
                  className="border-t border-border"
                >
                  <td className="py-2 pr-2">{row.title}</td>
                  <td className="py-2 pr-2 text-muted">{row.period}</td>
                  <td
                    className={`py-2 text-right ${row.status === "done" ? "text-accent" : "text-muted"}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section
        aria-labelledby="partners-heading"
        className="flex flex-col gap-2"
      >
        <h2
          id="partners-heading"
          className="text-sm font-semibold uppercase tracking-wide text-muted"
        >
          Partners
        </h2>
        {data.partners.length === 0 ? (
          <p className="text-muted">No partners yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.partners.map((partner) => (
              <li key={partner.id} className="flex flex-col gap-1.5">
                <p className="text-sm">
                  <span className="font-medium">{partner.name}</span>
                  <span className="text-muted">
                    {" "}
                    — {partner.checked} of {partner.elapsed} day
                    {partner.elapsed === 1 ? "" : "s"}
                  </span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {partner.days.map((day, index) => {
                    const date = `${data.month}-${String(index + 1).padStart(2, "0")}`;
                    const state =
                      day === "checked"
                        ? "checked"
                        : day === "missed"
                          ? "not checked"
                          : "not yet";
                    return (
                      <span
                        key={date}
                        role="img"
                        aria-label={`${partner.name}, ${formatMonthLong(date)}, ${state}`}
                        className={`h-2.5 w-2.5 rounded-sm ${
                          day === "checked"
                            ? "bg-accent"
                            : day === "missed"
                              ? "bg-border"
                              : "border border-border"
                        }`}
                      />
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
