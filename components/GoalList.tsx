"use client";

import { useState } from "react";

import GoalForm from "@/components/GoalForm";
import { archiveGoal, moveGoal, unarchiveGoal } from "@/lib/actions/goals";
import type { Role } from "@/lib/dal";
import type { Cadence, GoalWithMeta } from "@/lib/queries/goals";

const SECTIONS: { cadence: Cadence; label: string }[] = [
  { cadence: "daily", label: "Daily" },
  { cadence: "weekly", label: "Weekly" },
  { cadence: "monthly", label: "Monthly" },
];

/** GOAL-01..12 — the goal list, add/edit, archive/restore, reorder, delete. */
export default function GoalList({
  initialGoals,
  role,
  ownerFirstName,
  defaultStartsOn,
}: {
  initialGoals: GoalWithMeta[];
  role: Role;
  ownerFirstName: string;
  defaultStartsOn: string;
}) {
  const [goals, setGoals] = useState(initialGoals);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const isOwner = role === "owner";

  function upsert(goal: GoalWithMeta) {
    setGoals((prev) =>
      prev.some((existing) => existing.id === goal.id)
        ? prev.map((existing) => (existing.id === goal.id ? goal : existing))
        : [...prev, goal],
    );
  }

  function remove(id: string) {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }

  function applyReorder(updated: { id: string; sortOrder: number }[]) {
    if (updated.length === 0) return;
    setGoals((prev) =>
      prev.map((goal) => {
        const change = updated.find((entry) => entry.id === goal.id);
        return change ? { ...goal, sortOrder: change.sortOrder } : goal;
      }),
    );
  }

  async function handleArchive(goal: GoalWithMeta) {
    if (!window.confirm(`Archive "${goal.title}"?`)) return;
    const result = await archiveGoal(goal.id);
    if (result.ok) upsert(result.goal);
  }

  async function handleUnarchive(goal: GoalWithMeta) {
    const result = await unarchiveGoal(goal.id);
    if (result.ok) upsert(result.goal);
  }

  async function handleMove(goal: GoalWithMeta, direction: "up" | "down") {
    const result = await moveGoal(goal.id, direction);
    if (result.ok) applyReorder(result.updated);
  }

  const active = goals.filter((goal) => goal.endsOn === null);
  const archived = goals.filter((goal) => goal.endsOn !== null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        {isOwner && !addFormOpen && (
          <button
            type="button"
            onClick={() => setAddFormOpen(true)}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Add goal
          </button>
        )}
      </div>

      {goals.length === 0 && !addFormOpen && (
        <p className="text-muted">
          {isOwner
            ? "No goals yet."
            : `${ownerFirstName} hasn't added goals yet.`}
        </p>
      )}

      {addFormOpen && (
        <GoalForm
          defaultStartsOn={defaultStartsOn}
          onCancel={() => setAddFormOpen(false)}
          onSaved={(goal) => {
            upsert(goal);
            setAddFormOpen(false);
          }}
        />
      )}

      {SECTIONS.map(({ cadence, label }) => {
        const list = active
          .filter((goal) => goal.cadence === cadence)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        if (list.length === 0) return null;

        return (
          <section key={cadence} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {label}
            </h2>
            <div className="flex flex-col gap-2">
              {list.map((goal, index) =>
                editingId === goal.id ? (
                  <GoalForm
                    key={goal.id}
                    goal={goal}
                    defaultStartsOn={defaultStartsOn}
                    onCancel={() => setEditingId(null)}
                    onSaved={(updated) => {
                      upsert(updated);
                      setEditingId(null);
                    }}
                    onDeleted={(id) => {
                      remove(id);
                      setEditingId(null);
                    }}
                  />
                ) : (
                  <div
                    key={goal.id}
                    className="flex min-h-12 flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium">{goal.title}</p>
                      {goal.description && (
                        <p className="text-sm text-muted">{goal.description}</p>
                      )}
                    </div>
                    {isOwner && (
                      <div className="flex flex-wrap gap-3 text-sm font-medium text-muted">
                        <button
                          type="button"
                          onClick={() => setEditingId(goal.id)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMove(goal, "up")}
                          className="disabled:opacity-40"
                        >
                          Move up
                        </button>
                        <button
                          type="button"
                          disabled={index === list.length - 1}
                          onClick={() => handleMove(goal, "down")}
                          className="disabled:opacity-40"
                        >
                          Move down
                        </button>
                        <button
                          type="button"
                          onClick={() => handleArchive(goal)}
                        >
                          Archive
                        </button>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          </section>
        );
      })}

      {archived.length > 0 && (
        <details className="rounded-xl border border-border p-3">
          <summary className="cursor-pointer text-sm font-medium text-muted">
            Archived ({archived.length})
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {archived.map((goal) =>
              editingId === goal.id ? (
                <GoalForm
                  key={goal.id}
                  goal={goal}
                  defaultStartsOn={defaultStartsOn}
                  onCancel={() => setEditingId(null)}
                  onSaved={(updated) => {
                    upsert(updated);
                    setEditingId(null);
                  }}
                  onDeleted={(id) => {
                    remove(id);
                    setEditingId(null);
                  }}
                />
              ) : (
                <div
                  key={goal.id}
                  className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{goal.title}</p>
                    {goal.description && (
                      <p className="text-sm text-muted">{goal.description}</p>
                    )}
                  </div>
                  {isOwner && (
                    <div className="flex gap-3 text-sm font-medium text-muted">
                      <button
                        type="button"
                        onClick={() => setEditingId(goal.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnarchive(goal)}
                      >
                        Restore
                      </button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </details>
      )}
    </div>
  );
}
