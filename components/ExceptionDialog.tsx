"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createException } from "@/lib/actions/exceptions";
import { isActive } from "@/lib/periods";
import type { ExceptionRecord, ViewGoal } from "@/lib/view/day";

/** EXC-01..05 — the "Mark an exception" dialog. */
export default function ExceptionDialog({
  date,
  goals,
  onCancel,
  onCreated,
}: {
  date: string;
  goals: readonly ViewGoal[];
  onCancel: () => void;
  onCreated: (exception: ExceptionRecord) => void;
}) {
  const activeGoals = goals.filter((goal) => isActive(goal, date));

  const [scope, setScope] = useState<"whole-day" | "goal">("whole-day");
  const [goalId, setGoalId] = useState(activeGoals[0]?.id ?? "");
  const [startsOn, setStartsOn] = useState(date);
  const [endsOn, setEndsOn] = useState(date);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createException({
        scope,
        goalId: scope === "goal" ? goalId : null,
        startsOn,
        endsOn,
        reason,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onCreated(result.exception);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Scope</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="exception-scope"
            checked={scope === "whole-day"}
            onChange={() => setScope("whole-day")}
          />
          Whole day
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="exception-scope"
            checked={scope === "goal"}
            onChange={() => setScope("goal")}
          />
          One goal
        </label>
        {scope === "goal" && (
          <select
            aria-label="Goal"
            value={goalId}
            onChange={(event) => setGoalId(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {activeGoals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
        )}
      </fieldset>

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          From
          <input
            type="date"
            value={startsOn}
            onChange={(event) => setStartsOn(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          To
          <input
            type="date"
            value={endsOn}
            onChange={(event) => setEndsOn(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="exception-reason" className="text-sm font-medium">
          Reason
        </label>
        <textarea
          id="exception-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={2}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <span className="text-xs text-muted">{reason.length}/280</span>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-2 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
