import type { ReactNode } from "react";

import PrintButton from "./PrintButton";

import type { Status } from "@/lib/status";
import { STATUS_LABEL, type ExportData } from "@/lib/view/export";

/** The daily log's marks (EXP-09); upcoming is blank. */
const MARK: Record<Status, string> = {
  done: "✓",
  failed: "✗",
  excused: "E",
  pending: "·",
  upcoming: "",
  "not-counting": "–",
};

const LEGEND: Status[] = [
  "done",
  "failed",
  "excused",
  "pending",
  "not-counting",
];

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className="flex flex-col gap-2 print:break-inside-avoid-page"
    >
      <h2
        id={`${id}-heading`}
        className="text-sm font-semibold uppercase tracking-wide text-muted"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Lines({ items, empty }: { items: string[]; empty: string }) {
  return items.length === 0 ? (
    <p className="text-sm text-muted">{empty}</p>
  ) : (
    <ul className="flex flex-col gap-1 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function CheckinGroups({
  groups,
}: {
  groups: { key: string; title: string; days: number; entries: string[] }[];
}) {
  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.key} className="flex flex-col gap-1">
          <p className="text-sm">
            <span className="font-medium">{group.title}</span>
            <span className="text-muted"> — {plural(group.days, "day")}</span>
          </p>
          {group.entries.length > 0 && (
            <ul className="flex flex-col gap-0.5 pl-3 text-sm text-muted">
              {group.entries.map((entry, index) => (
                <li key={index}>{entry}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * EXP-02..17 — the student's report: a range form and the two downloads
 * (hidden in print), then the report as a plain document.
 */
export default function ExportView({
  data,
  documents,
  given,
  csvHref,
}: {
  data: ExportData;
  documents: { vision: string; contract: string };
  given: boolean;
  csvHref: string;
}) {
  const { summary } = data;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 print:hidden">
        <form
          aria-label="Report options"
          action="/export"
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-xl border border-border p-4 print:hidden"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">From</span>
            <input
              type="date"
              name="from"
              defaultValue={data.range.from}
              className="min-h-11 rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">To</span>
            <input
              type="date"
              name="to"
              defaultValue={data.range.to}
              className="min-h-11 rounded-lg border border-border bg-background px-3"
            />
          </label>
          <label className="flex min-h-11 basis-full items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="given"
              value="1"
              defaultChecked={given}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            Include check-ins I made on teammates
          </label>
          <button
            type="submit"
            className="ui-hover-surface min-h-11 rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Update
          </button>
        </form>
        <div className="flex flex-wrap gap-3 print:hidden">
          <PrintButton />
          <a
            href={csvHref}
            className="ui-hover-surface flex min-h-11 items-center rounded-full border border-border px-4 py-2 text-sm font-medium"
          >
            Download CSV
          </a>
        </div>
      </div>

      <article className="flex flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Goal report</h1>
          <p className="font-medium">{data.owner}</p>
          <p>{data.rangeLabel}</p>
          <p className="text-sm text-muted">{data.contractLabel}</p>
          <p className="text-sm text-muted">{data.exportedLabel}</p>
        </header>

        <Section id="summary" title="Summary">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border p-3">
              <p className="font-semibold">
                {summary.completion
                  ? `${summary.completion.percent}% complete`
                  : "Nothing counted yet"}
              </p>
              {summary.completion && (
                <p className="text-xs text-muted">
                  {summary.completion.done} of {summary.completion.total}{" "}
                  counting past periods done
                </p>
              )}
            </div>
            <p className="rounded-xl border border-border p-3 font-semibold">
              {plural(summary.failures, "failure")}
            </p>
            <p className="rounded-xl border border-border p-3 font-semibold">
              {plural(summary.exceptions, "exception")}
            </p>
            <p className="rounded-xl border border-border p-3 font-semibold">
              Longest streak: {plural(summary.longestStreak, "day")}
            </p>
          </div>
        </Section>

        {(["vision", "contract"] as const).map((key) => (
          <Section
            key={key}
            id={key}
            title={key === "vision" ? "Vision" : "Contract"}
          >
            {documents[key] ? (
              <div
                className="doc max-w-prose"
                dangerouslySetInnerHTML={{ __html: documents[key] }}
              />
            ) : (
              <p className="text-sm text-muted">Not written yet.</p>
            )}
          </Section>
        ))}

        <Section id="goals" title="Goals">
          {data.goals.length === 0 ? (
            <p className="text-sm text-muted">No goals in this range.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {data.goals.map((goal) => (
                <li
                  key={goal.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{goal.title}</span>
                    <span className="text-muted">
                      {" "}
                      · {goal.cadence} · {goal.started}
                      {goal.archived && ` · ${goal.archived}`}
                    </span>
                  </span>
                  <span>{goal.record}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="log" title="Daily log">
          <ul
            aria-label="Legend"
            className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"
          >
            {LEGEND.map((status) => (
              <li key={status}>
                {MARK[status]} {STATUS_LABEL[status]}
              </li>
            ))}
          </ul>
          {data.months.map((month) => (
            <div
              key={month.month}
              className="flex flex-col gap-2 print:break-inside-avoid-page"
            >
              <h3 className="font-semibold">{month.label}</h3>
              <div className="max-w-full overflow-x-auto print:overflow-visible">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Date</th>
                      {data.dailyGoals.map((goal) => (
                        <th
                          key={goal.id}
                          className="px-1 py-1 text-center font-medium"
                        >
                          {goal.title}
                        </th>
                      ))}
                      <th className="py-1 pl-2 font-medium">Check-ins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {month.days.map((day) => (
                      <tr
                        key={day.date}
                        className={`border-t border-border ${
                          day.outsideContract ? "text-muted" : ""
                        }`}
                      >
                        <td className="whitespace-nowrap py-1 pr-2">
                          {day.label}
                          {day.outsideContract && (
                            <span className="block text-xs">
                              Outside contract
                            </span>
                          )}
                        </td>
                        {day.marks.map((mark, index) => (
                          <td
                            key={data.dailyGoals[index].id}
                            className={`px-1 py-1 text-center ${
                              mark === "done" ? "text-accent" : ""
                            }`}
                          >
                            {mark && (
                              <>
                                <span aria-hidden>{MARK[mark]}</span>
                                <span className="sr-only">
                                  {STATUS_LABEL[mark]}
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                        <td className="py-1 pl-2 text-muted">
                          {day.checkedBy.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </Section>

        {data.periods.length > 0 && (
          <Section id="periods" title="Weekly & monthly">
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
                    <td className="py-1 pr-2">{row.title}</td>
                    <td className="py-1 pr-2 text-muted">{row.period}</td>
                    <td
                      className={`py-1 text-right ${row.status === "done" ? "text-accent" : "text-muted"}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        <Section id="failures" title="Failures">
          <Lines items={data.failures} empty="None." />
        </Section>

        <Section id="exceptions" title="Exceptions">
          <Lines items={data.exceptions} empty="None." />
        </Section>

        <Section id="received" title="Check-ins from partners">
          {data.received.length === 0 ? (
            <p className="text-sm text-muted">No partners yet.</p>
          ) : (
            <CheckinGroups
              groups={data.received.map((group) => ({
                key: group.id,
                title: group.name,
                days: group.days,
                entries: group.entries,
              }))}
            />
          )}
        </Section>

        {data.given && (
          <Section id="given" title="Check-ins you made">
            {data.given.length === 0 ? (
              <p className="text-sm text-muted">None in this range.</p>
            ) : (
              <CheckinGroups
                groups={data.given.map((group) => ({
                  key: group.team,
                  title: group.team,
                  days: group.days,
                  entries: group.entries,
                }))}
              />
            )}
          </Section>
        )}
      </article>
    </div>
  );
}
