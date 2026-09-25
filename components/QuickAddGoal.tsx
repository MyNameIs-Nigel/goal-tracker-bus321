"use client";

import { useState, useTransition, type FormEvent } from "react";

import { createGoal } from "@/lib/actions/goals";
import type { ViewGoal } from "@/lib/view/day";

/** DT-15 — a first daily goal, without leaving /today. */
export default function QuickAddGoal({
  onAdded,
}: {
  onAdded: (goal: ViewGoal) => void;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createGoal({
        title,
        description: "",
        cadence: "daily",
        startsOn: "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const {
        id,
        title: saved,
        cadence,
        startsOn,
        endsOn,
        sortOrder,
      } = result.goal;
      onAdded({ id, title: saved, cadence, startsOn, endsOn, sortOrder });
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="first-goal" className="text-sm font-medium">
        Your first daily goal
      </label>
      <div className="flex gap-2">
        <input
          id="first-goal"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Read 20 pages"
          className="ui-hover-edge min-h-11 min-w-0 flex-1 rounded-full border border-border bg-background px-4 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="ui-hover-solid rounded-full bg-accent px-5 text-sm font-medium text-on-accent disabled:opacity-60"
        >
          Add
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
