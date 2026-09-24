"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db/client";
import { exceptions } from "@/db/schema";
import { requireUser } from "@/lib/dal";
import { getGoal } from "@/lib/queries/goals";
import type { ExceptionRecord } from "@/lib/view/day";
import { validateExceptionInput } from "@/lib/validation/exceptions";

export type ExceptionInput = {
  scope: "whole-day" | "goal";
  goalId: string | null;
  startsOn: string;
  endsOn: string;
  reason: string;
};

export type ExceptionActionResult =
  { ok: true; exception: ExceptionRecord } | { ok: false; error: string };

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/** EXC-02/03 — a whole-day or goal-specific exception on the caller's own team. */
export async function createException(
  input: ExceptionInput,
): Promise<ExceptionActionResult> {
  const { teamId } = await requireUser();

  const error = validateExceptionInput(input);
  if (error) return { ok: false, error };

  let goalId: string | null = null;
  if (input.scope === "goal") {
    // EXC-09 — only one of the caller's own goals.
    const goal = input.goalId ? await getGoal(teamId, input.goalId) : null;
    if (!goal) return { ok: false, error: "Choose a goal." };
    goalId = goal.id;
  }

  const [row] = await db
    .insert(exceptions)
    .values({
      teamId,
      goalId,
      startsOn: input.startsOn,
      endsOn: input.endsOn,
      reason: input.reason.trim(),
    })
    .returning();

  revalidatePath("/today");

  return {
    ok: true,
    exception: {
      id: row.id,
      goalId: row.goalId,
      startsOn: row.startsOn,
      endsOn: row.endsOn,
      reason: row.reason,
    },
  };
}

/** EXC-06 — remove one of the caller's own exceptions (EXC-09: nobody else's). */
export async function removeException(id: string): Promise<SimpleActionResult> {
  const { teamId } = await requireUser();

  const removed = await db
    .delete(exceptions)
    .where(and(eq(exceptions.id, id), eq(exceptions.teamId, teamId)))
    .returning({ id: exceptions.id });
  if (removed.length === 0) {
    return { ok: false, error: "Exception not found." };
  }

  revalidatePath("/today");
  return { ok: true };
}
