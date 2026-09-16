"use client";

import { useState, useTransition, type FormEvent } from "react";

import {
  createGoal,
  deleteGoal,
  updateGoal,
  type GoalInput,
} from "@/lib/actions/goals";
import type { GoalWithMeta } from "@/lib/queries/goals";

const CADENCE_LABELS: Record<GoalInput["cadence"], string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};
const CADENCES = Object.keys(CADENCE_LABELS) as GoalInput["cadence"][];

/** GOAL-02..06 — add/edit form; GOAL-05 locks cadence once the goal has a completion. */
export default function GoalForm({
  goal,
  defaultStartsOn,
  onCancel,
  onSaved,
  onDeleted,
}: {
  goal?: GoalWithMeta;
  defaultStartsOn: string;
  onCancel: () => void;
  onSaved: (goal: GoalWithMeta) => void;
  onDeleted?: (id: string) => void;
}) {
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState(goal?.description ?? "");
  const [cadence, setCadence] = useState<GoalInput["cadence"]>(
    goal?.cadence ?? "daily",
  );
  const [startsOn, setStartsOn] = useState(goal?.startsOn ?? defaultStartsOn);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const cadenceLocked = Boolean(goal?.hasCompletions);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const input: GoalInput = { title, description, cadence, startsOn };
      const result = goal
        ? await updateGoal(goal.id, input)
        : await createGoal(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved(result.goal);
    });
  }

  function handleDelete() {
    if (!goal) return;
    if (!window.confirm(`Delete "${goal.title}"? This can't be undone.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteGoal(goal.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDeleted?.(goal.id);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="goal-title" className="text-sm font-medium">
          Title
        </label>
        <input
          id="goal-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal-description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="goal-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Cadence</legend>
        <div className="flex gap-2">
          {CADENCES.map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm ${
                cadence === value ? "bg-accent text-white" : ""
              } ${cadenceLocked ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="cadence"
                value={value}
                checked={cadence === value}
                disabled={cadenceLocked}
                onChange={() => setCadence(value)}
                className="sr-only"
              />
              {CADENCE_LABELS[value]}
            </label>
          ))}
        </div>
        {cadenceLocked && (
          <p className="text-xs text-muted">
            Cadence can&apos;t change once you&apos;ve checked this off. Archive
            it and create a new goal.
          </p>
        )}
      </fieldset>

      <div className="flex flex-col gap-1">
        <label htmlFor="goal-starts-on" className="text-sm font-medium">
          Start date
        </label>
        <input
          id="goal-starts-on"
          type="date"
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
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
        {goal && !goal.hasCompletions && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto rounded-full px-4 py-2 text-sm font-medium text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
