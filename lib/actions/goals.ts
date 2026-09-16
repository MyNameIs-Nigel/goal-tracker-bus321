"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { goals } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { today } from "@/lib/clock";
import { ForbiddenError, requireUser } from "@/lib/dal";
import {
  activeGoalsInCadence,
  getGoal,
  getGoalWithMeta,
  goalHasCompletions,
  type Cadence,
  type GoalWithMeta,
} from "@/lib/queries/goals";
import { validateGoalInput } from "@/lib/validation/goals";

export type GoalInput = {
  title: string;
  description: string;
  cadence: Cadence;
  startsOn: string;
};

export type GoalActionResult =
  { ok: true; goal: GoalWithMeta } | { ok: false; error: string };

export type MoveGoalResult =
  | { ok: true; updated: { id: string; sortOrder: number }[] }
  | { ok: false; error: string };

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

const CADENCES: readonly Cadence[] = ["daily", "weekly", "monthly"];

async function requireOwnerCaller() {
  const user = await requireUser();
  if (user.role !== "owner") throw new ForbiddenError();
  return user;
}

function revalidateGoalPages() {
  revalidatePath("/goals");
  revalidatePath("/today");
}

/** GOAL-02 — owner adds a goal. */
export async function createGoal(input: GoalInput): Promise<GoalActionResult> {
  await requireOwnerCaller();

  const error = validateGoalInput(input);
  if (error) return { ok: false, error };
  if (!CADENCES.includes(input.cadence)) {
    return { ok: false, error: "Invalid cadence." };
  }

  const siblings = await activeGoalsInCadence(input.cadence);

  const [{ id }] = await db
    .insert(goals)
    .values({
      title: input.title.trim(),
      description: input.description.trim() || null,
      cadence: input.cadence,
      startsOn: input.startsOn || today(),
      sortOrder: siblings.length,
    })
    .returning({ id: goals.id });

  revalidateGoalPages();
  return { ok: true, goal: (await getGoalWithMeta(id))! };
}

/** GOAL-04/05/06 — owner edits a goal; GOAL-05 locks cadence once it has a completion. */
export async function updateGoal(
  id: string,
  input: GoalInput,
): Promise<GoalActionResult> {
  await requireOwnerCaller();

  const error = validateGoalInput(input);
  if (error) return { ok: false, error };
  if (!CADENCES.includes(input.cadence)) {
    return { ok: false, error: "Invalid cadence." };
  }

  const existing = await getGoal(id);
  if (!existing) return { ok: false, error: "Goal not found." };

  if (input.cadence !== existing.cadence && (await goalHasCompletions(id))) {
    return {
      ok: false,
      error:
        "Cadence can't change once you've checked this off. Archive it and create a new goal.",
    };
  }

  await db
    .update(goals)
    .set({
      title: input.title.trim(),
      description: input.description.trim() || null,
      cadence: input.cadence,
      startsOn: input.startsOn,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id));

  revalidateGoalPages();
  return { ok: true, goal: (await getGoalWithMeta(id))! };
}

/** GOAL-07 — archive ends a goal yesterday, so it drops off today and today's period. */
export async function archiveGoal(id: string): Promise<GoalActionResult> {
  await requireOwnerCaller();

  await db
    .update(goals)
    .set({ endsOn: addDays(today(), -1), updatedAt: new Date() })
    .where(eq(goals.id, id));

  revalidateGoalPages();
  return { ok: true, goal: (await getGoalWithMeta(id))! };
}

/** GOAL-08 — restore an archived goal. */
export async function unarchiveGoal(id: string): Promise<GoalActionResult> {
  await requireOwnerCaller();

  await db
    .update(goals)
    .set({ endsOn: null, updatedAt: new Date() })
    .where(eq(goals.id, id));

  revalidateGoalPages();
  return { ok: true, goal: (await getGoalWithMeta(id))! };
}

/** GOAL-09 — delete only when nothing has been recorded; cascades to exceptions. */
export async function deleteGoal(id: string): Promise<SimpleActionResult> {
  await requireOwnerCaller();

  if (await goalHasCompletions(id)) {
    return {
      ok: false,
      error: "This goal has check-offs and can't be deleted.",
    };
  }

  await db.delete(goals).where(eq(goals.id, id));

  revalidateGoalPages();
  return { ok: true };
}

/** GOAL-10 — move a goal up or down within its cadence. */
export async function moveGoal(
  id: string,
  direction: "up" | "down",
): Promise<MoveGoalResult> {
  await requireOwnerCaller();

  const goal = await getGoal(id);
  if (!goal || goal.endsOn !== null) {
    return { ok: false, error: "Goal not found." };
  }

  const siblings = await activeGoalsInCadence(goal.cadence);
  const index = siblings.findIndex((sibling) => sibling.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) {
    return { ok: true, updated: [] };
  }

  const neighbor = siblings[swapIndex];
  await db.transaction(async (tx) => {
    await tx
      .update(goals)
      .set({ sortOrder: neighbor.sortOrder })
      .where(eq(goals.id, goal.id));
    await tx
      .update(goals)
      .set({ sortOrder: goal.sortOrder })
      .where(eq(goals.id, neighbor.id));
  });

  revalidateGoalPages();
  return {
    ok: true,
    updated: [
      { id: goal.id, sortOrder: neighbor.sortOrder },
      { id: neighbor.id, sortOrder: goal.sortOrder },
    ],
  };
}
